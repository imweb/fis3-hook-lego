/**
 * pack
 * @author jerojiang
 * @date 2015-09-18
 */

'use strict';
var DEF_CONF = {
    // 脚本占位符
    scriptPlaceHolder: '<!--SCRIPT_PLACEHOLDER-->',

    // 样式占位符
    stylePlaceHolder: '<!--STYLE_PLACEHOLDER-->',

    // 资源占位符
    resourcePlaceHolder: '<!--RESOURCEMAP_PLACEHOLDER-->',

    output: 'pkg/${id}_min_${hash}.js',

    // 自动分析资源并在页面中载入
    autoLoad: false,

    // 自动打包资源
    autoPack: false,

    lib: ['jquery', 'zepto', 'common', 'qqapi'],

    ignore: [],

    libDict: {},

    ignoreDict: {},

    cssInline: false

};


var _ = fis.util;
var Page = require('./page');

module.exports = function(ret, pack) {
    if (!_.isEmpty(pack)) { // 配置过打包的话，就不走 lego 智能打包
        return;
    }


    var packager = _.applyMatches('::package', fis.media().getSortedMatches()); // 测试和发布

    if (!packager.lego.autoLoad) {
        return;
    }

    var files = ret.src;
    var conf = _.assign({}, DEF_CONF, packager.lego);

    (conf.lib || []).forEach(function(lib) {
        conf.libDict[lib] = 1;
    });
    (conf.ignore || []).forEach(function(ignore) {
        conf.ignoreDict[ignore] = 1;
    });

    Object.keys(files).forEach(function(subpath) {
        var file = files[subpath];

        if (file.isHtmlLike && !file.page) {
            file.page = new Page(file, ret, conf); // 实例化一个页面
        }
    });
};
