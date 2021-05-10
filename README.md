# 描述
这个一个mini版的webpack实现， 主要是为了切身体会一下webpack的打包原理

# 目标
将使用了import/export ES6语法的代码打包成一个能在浏览器中运行的ES5代码

# 运行
```
1. npm run build
2. 浏览中打开index.html, 查看浏览器调试框

```

# 打包原理
## 1. 如何让js代码字符串运行？
    
这里使用了eval(code)
## 2. 分析模块
```
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
```

## 3. 全局收集依赖
```
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
```

## 4. 生成bundle文件

```
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

```

## 5. 每次清除dist文件夹

```
!fs.existsSync("./dist") && fs.mkdirSync("./dist")
fs.writeFileSync('./dist/bundle.js', content)
```
