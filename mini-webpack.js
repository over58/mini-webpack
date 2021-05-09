
// 第二版
// function __require__(filePath) {
//     var exports = {}
//     const code = fs.readFileSync(filePath).toString();
//     (function(exports, code) {
//         eval(code)
//     })(exports, code);

//     console.log(
//         exports.default(3,4)
//     )
// }

// 模拟require和exports对象
// 第三版
// ;(function (list) {
//   function require(filePath) {
//     var exports = {}
//     ;(function (exports, code) {
//       eval(code)
//     })(exports, list[filePath])
//     return exports
//   }
//   require('./src/index.js')
// })({
//   './src/index.js': `
//         const add = require("./add.js").default
//         const result= add(1,3)
//         console.log(result)
//     `,
//   './add.js': `
//         function add (a,b) {
//             return a+b
//         }
//         exports.default = add
//     `,
// })


// 构建依赖树depGraph


const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require("@babel/traverse").default
const babel = require("@babel/core")

function getModuleInfo(file){ 
  // 读取文件
  const body = fs.readFileSync(file,'utf-8')

  // 转换成AST
  const ast = parser.parse(body, {
    sourceType: 'module', //表示我们要解析的是ES模块
  })


  // 依赖收集
  const deps = {}
  traverse(ast, {
    ImportDeclaration({node}) {
      const dirname = path.dirname(file)
      const abspath = "./" + path.join(dirname, node.source.value)
      deps[node.source.value] = abspath
    }
  })

  // ES6转换成ES5
  const {code} = babel.transformFromAst(ast, null, {
    presets:["@babel/preset-env"]
  });
  const moduleInfo = {file, deps, code}

  return moduleInfo
}




// const info = getModuleInfo("./src/index.js")
// console.log("info:", info)

// 依赖收集, 广度优先遍历收集所有的依赖
function parseModules(file) {
  const entry = getModuleInfo(file)
  const temp = [entry]
  const depsGraph = {}
  
  getDeps(temp, entry);

  temp.forEach(moduleInfo => {
    depsGraph[moduleInfo.file] = {
      deps: moduleInfo.deps,
      code: moduleInfo.code
    }
  })

  return depsGraph
}


function getDeps(temp, {deps}) {
  Object.keys(deps).forEach(key => {
    const child = getModuleInfo(deps[key])
    temp.push(child)
    getDeps(temp,child)
  })
}


// const depsGraph = parseModules("./src/index.js")
// console.log(depsGraph)

// 生成bundle文件

function bundle(file) {
  const depsGraph = JSON.stringify(parseModules(file))

  return `(function(graph){
    function require(file) {
      function absRequire(realPath) {
        return require(graph[file].deps[realPath])
      }
      var exports = {}
      ;(function (require, exports,code) {
        eval(code)
      })(absRequire, exports, graph[file].code)
      return exports
    }
    require('${file}')
  })(${depsGraph})`
}

const content = bundle("./src/index.js")
!fs.existsSync("./dist") && fs.mkdirSync("./dist")
fs.writeFileSync('./dist/bundle.js', content)