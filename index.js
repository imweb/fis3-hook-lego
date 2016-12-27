/**
 * lego mmodule hook
 * @author jerojiang
 * @link http://lego.imweb.io/
 */
var lookup = require('./lookup'),
    powerLego = require('./powerLego'),
    opts = null; // running context opts

var entry = module.exports = function(fis, _opts) {
    // set opts
    opts = _opts;

    fis.on('lookup:file', onLookupFile);

    opts.hookHtml && fis.on('proccess:start', onProccessStart);
};

function onLookupFile(info, file) {
    // 不处理相对路径的文件
    // 不能跳过已经有info.id的文件，必须处理
    //    例如: abc.js中require('abc') CommonJs的lookup会找到自己,
    //      并不一定需要require('./abc'), 此时如果是想要lego_modules下的abc就惨了
    if (file.isJsLike && info.rest && info.rest[0] !== '.') {
        var ret = lookup(info.rest, opts);
        if (ret && ret.file) {
            info.id = ret.file.getId();
            info.moduleId = ret.file.moduleId;
            info.file = ret.file;
        }
    } else if (opts.powerLego && info.rest && powerLego.reg.test(info.rest) && !info.id) {
        // 处理inline和样式
        var ret = powerLego.lookup(info.rest, opts);
        if (ret && ret.file) {
            info.id = ret.file.getId();
            info.file = ret.file;
        }
    }
}

function onProccessStart(file) {
    // 处理html中的链接
    // fis isPartial标识是否是内嵌部分
    if (!file.isPartial && file._likes.isHtmlLike) {
        var content = file.getContent();
        if (content) {
            content = content.replace(
                /(<script\s[^>]*src=["'])([^?#"']+)/g, 
                function(str, before, src) {
                    if (src[0] !== '.' && !src.match(/^\w+:/i)) {
                        var ret = lookup(src, opts);
                        if (ret && ret.file) {
                            return before + ret.file.getId().replace(/^\/?/, '/');
                        }
                    }
                    return str;
                }
            );
            file.setContent(content);
        }
    }
}

entry.defaultOptions = {
    /**
     * @type {Boolean}
     * 是否处理html script的src <script src="">
     */
    hookHtml: false,

    /**
     * @type {Object}
     * 查找路径及类型
     */
    paths: [
        {
            location: 'modules',
            // modules/mod.js
            // modules/mod/mod.js
            type: 'mod'
        },
        {
            location: 'lego_modules',
            // lego_modules/pkgName/version/subFile
            type: 'lego'
        }
    ]
};

