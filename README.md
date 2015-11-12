# fis3-hook-lego
fis3 版本的 `lego` 包管理的模块查找，[http://lego.imweb.io/](http://lego.imweb.io/) 。

## 背景
如下目录结构：

```
    .
    ├── index.html
    ├── lego_modules
    │   ├── dialog
    │   │   └── 0.1.0
    │   │       ├── custom.js
    │   │       └── package.json
    │   ├── slider
    │   │   └── 0.1.0
    │   │       └── index.js
    │   ├── tab
    │   │   └── 0.1.0
    │   │       └── tab.js
    │   └── test_module
    │       └── 0.1.0
    │           └── index.js
    ├── map.json
    ├── modules
    │   ├── common
    │   │   ├── common.js
    │   │   └── header
    │   │       ├── db.header.js
    │   │       └── header.js
    │   ├── common.js
    │   ├── index
    │   │   └── header
    │   │       ├── db.header.js
    │   │       └── header.js
    │   └── test_module.js
    └── pages
        └── index
            ├── main.css
            └── main.js
```
现在 `main.js ` 内容：

```js
var dialog = require('dialog');
var slider = require('slider');
var tab = require('tab');   // lego_modules 中的快速引用
var version = require('versions@0.1.0'); // 指定版本
var common = require('common');
var testModule = require('test_module');
var header = require('index/header');   // modules 中也可以省去 `modules`
var index = require('index'); // 查找modules/index.js ; modules/index/index.js
```


## 使用

### 安装
```
npm i fis3-hook-lego -g
```

### 配置
在 `fis-conf.js` 中：
```js
fis.hook('lego');

fis.match(/^\/modules\/(.+)\.js$/, {
        isMod: true,
        id: '$1'
    })
    .match(/^\/modules\/((?:[^\/]+\/)*)([^\/]+)\/\2\.(js)$/i, {
        //isMod: true,
        id: '$1$2'
    })
    .match(/^\/lego_modules\/(.+)\.js$/i, {
        isMod: true,
        id: '$1'
    });
```

### 注意
由于有多版本的场景，lego会修改文件id，`比如require('zepto'), 产出后是 require('zepto/1.1.6/zepto')`,
其他插件的配置中需要zepto时，比如 ignore: ['zepto']，查找会有问题，解决方案：
1. ignore: ['zepto/1.1.6/zepto']，指定具体的版本
2. 在处理逻辑之前，调用 fis.get('idMaps'), 将zepto的id进行转化（ps：idMaps中记录了lego对文件id的修改，key值是修改前的id，value是修改后的id）    
