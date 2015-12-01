/**
 * lego mmodule hook
 * @author jerojiang
 * @link http://lego.imweb.io/
 */
var lookup = require('./lookup');
var powerLego = require('./powerLego');
var entry = module.exports = function(fis, opts) {
    fis.on('lookup:file', function(info, file) {
        // 不处理相对路径的文件和已经处理了的文件
        if (file.isJsLike && info.rest && info.rest[0] !== '.' && !info.id) {
            var ret = lookup(info.rest, opts);
            if (ret && ret.file) {
                info.id = ret.file.getId();
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
    });
};

entry.defaultOptions = {
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

