/**
 * lego mmodule hook
 * @author jerojiang
 * @link http://lego.imweb.io/
 */
var lookup = require('./lookup');

var entry = module.exports = function(fis, opts) {
    fis.on('lookup:file', function(info, file) {
        if (file.isJsLike && info.rest) {
            var ret = lookup(info.rest, opts);
            if (ret) {
                info.id = ret;
                info.moduleId = 
                    ret.replace(/^[^\/]*\/?/, '').replace(/\.js$/,'');
            }
        }
    });
};

entry.defaultOptions = {
    paths: [
        {
            location: 'lego_modules',
            // lego_modules/pkgName/version/subFile
            type: 'lego'
        },
        {
            location: 'modules',
            // modules/mod.js
            // modules/mod/mod.js
            type: 'mod'
        }
    ]
};

