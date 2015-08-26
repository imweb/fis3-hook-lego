# fis3-hook-lego
fis3 版本的 `lego` 包管理的模块查找，[http://lego.imweb.io/](http://lego.imweb.io/) 。

## 背景
如下目录结构：

```
    root/
        src/
        lego_modules/
            jquery/
                2.0.1/  
                    jquery.js
                    package.json
        pages/
            index/
                /main.js
```
现在 `main.js ` 直接

```js
require('jquery');
require('jquery@1.9.1');
```
即可引用 `jquery` 。


## 使用

### 安装
```
npm i fis3-hook-lego -g
```

### 配置
在 `fis-conf.js` 中：
```js
fis.hook('lego');

fis.match(/^\/lego_modules\/(.+)\.js$/i, {
    isMod: true,
    id: '$1'
});
```