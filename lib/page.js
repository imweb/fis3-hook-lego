/**
 * page
 * @author jerojiang
 * @date 2015-09-19
 *
 * @desc
 *  智能的打包方式是怎样的呢？
 *      页面上只需要引入 js ，比如 `require('pages/index/main');` js 和 css 全部 all in one
 *
 *      all in one 其实不利于页面缓存，那这样：
 *          require('common');
 *          require('pages/index/main');
 *      多页面的项目， common 是公用资源， index/main 是页面级资源，这个时候打包？
 *      自动检测页面的依赖，默认打成两个文件 common.pkg.js 和 index.pkg.js ，当然对应两个 css
 *
 *      总体原则就是页面有几个入口 `require` 就智能打包成几个文件
 *
 *  健壮性的把控
 */

var Page;
var TPL = {
    js: '<script src="uri"></script>',
    css: '<link type="text/css" rel="stylesheet" href="uri">'
};
var _ = fis.util;
var DEF_CONF = {
    // 脚本占位符
    scriptPlaceHolder: '<!--SCRIPT_PLACEHOLDER-->',

    // 样式占位符
    stylePlaceHolder: '<!--STYLE_PLACEHOLDER-->',

    // 资源占位符
    resourcePlaceHolder: '<!--RESOURCEMAP_PLACEHOLDER-->',

    // 自动分析资源并在页面中载入
    autoLoad: false,

    // 自动打包资源
    autoPack: false

};


Page = module.exports = Object.derive(function(file, ids, conf, ret) {
    if (!(file && ids && conf && (conf.autoLoad || conf.autoPack))) {
        return;
    }

    this.conf = _.assign({}, DEF_CONF, conf);
    this.file = file;
    this.ids = ids;
    this.ret = ret;
    this.css = {
        PAGE: []
    };
    this.asyncs = [];
    this.js = {}; // 页面可能有多个 require 入口，一个入口对应一个资源
    this.pack = {};

    this.init();
}, {

    init: function() {
        var ids = this.ids;
        var self = this;

        this.file.requires.forEach(function(id) {
            var f = ids[id];

            if (f) {
                if (f.isJsLike) {
                    var deps = self.getDeps(id);

                    // deps.js.push(id);
                    self.js[id] = deps.js;
                    self.css[id] = deps.css;
                } else if (f.isCssLike) { // 页面上的 css ，有点蛋疼
                    self.css.PAGE.push(id);
                }
            }
        });

        self.asyncs = self.asyncs.concat(self.file.asyncs);

        if (self.conf.autoPack) {
            this._pack();
        }

        this.parseContent();
    },

    getDeps: function(baseId) {
        var ret = {
            js: [],
            css: []
        };
        var ids = this.ids;
        var self = this;

        function _getDeps(id) {
            var file = ids[id];

            if (file) {
                file.requires.forEach(function(depId) {
                    var f = ids[depId];

                    if (f && f.subpath) {
                        if (f.isJsLike) {
                            ret.js.push(depId);
                        } else if (f.isCssLike) {
                            ret.css.push(depId);
                        }
                    }

                    _getDeps(depId, ids);
                });

                if (file.isJsLike) {
                    ret.js.push(id);
                } else if (file.isCssLike) {
                    ret.css.push(id);
                }

                self.asyncs = self.asyncs.concat(file.asyncs);
            }
        }

        _getDeps(baseId);

        ret.js = _.unique(ret.js);
        ret.css = _.unique(ret.css);

        return ret;
    },

    parseContent: function() {
        var content = this.file.getContent();

        if (this.conf.autoPack) {
            content = this._getPackContent(content);
        } else {
            content = content.replace(this.conf.scriptPlaceHolder, this.parseScript())
                .replace(this.conf.stylePlaceHolder, this.parseStyle());
        }

        content = this._buildResourceMap(content);

        this.file.setContent(content);
    },

    parseScript: function() {
        return this._parse('js');
    },

    parseStyle: function() {
        return this._parse('css');
    },

    /**
     * 载入未打包的页面资源
     * @param type {string} js | css
     * @returns {string}
     * @private
     */
    _parse: function(type) {
        type = type || 'js';

        var tpl = TPL[type];
        var ret = '';
        var assets = this[type];
        var ids = this.ids;

        Object.keys(assets).forEach(function(main) {
            assets[main].forEach(function(id) {
                var file = ids[id];
                var uri = file && file.getUrl();

                if (uri) {
                    ret += tpl.replace('uri', uri) + '\n';
                }
            });
        });

        return ret;
    },

    _pack: function() {
        // var script;

        this._packFile();

        this._packFile('css');
    },

    _packFile: function(type) {
        type = type || 'js';

        var self = this;
        var ids = self.ids;
        var files = self[type];
        var root = fis.project.getProjectPath();

        Object.keys(files).forEach(function(fileId) {
            var file = ids[fileId];
            var deps = files[fileId];

            if (type === 'css' && deps) {
                file = ids[deps[0]];
            }

            if (!file) {
                return;
            }

            var targetFile = fis.file(root, 'pkg', file.subpath);

            var tempContent = '';

            deps.forEach(function(depsId) {
                var depsFile = ids[depsId];

                tempContent += depsFile.getContent();
            });

            targetFile.setContent(tempContent);
            self.ret.pkg[targetFile.subpath] = self.pack[targetFile.subpath] = targetFile;
        });
    },

    _getPackContent: function(content) {
        var packs = this.pack;
        var js = [];
        var css = [];

        Object.keys(packs).forEach(function(subpath) {
            var file = packs[subpath];

            if (!file) {
                return;
            }

            if (file.isJsLike) {
                js.push(TPL.js.replace('uri', file.getUrl()));
            } else if (file.isCssLike) {
                css.push(TPL.css.replace('uri', file.getUrl()));
            }
        });

        return content.replace(this.conf.scriptPlaceHolder, js.join('\n'))
                    .replace(this.conf.stylePlaceHolder, css.join('\n'));
    },

    _buildResourceMap: function(content) {
        var res = this.ret.map.res;
        var ret = {};

        var tpl = '<script>require.resourceMap(map);</script>'; // ' + JSON.stringify({res: res, pkg: pkg}, null, 2) + '

        var asyncs = this.asyncs;

        if (asyncs && asyncs.length) {
            asyncs.forEach(function(asyncId) {
                var r = res[asyncId];

                if (r) {
                    var temp = ret[asyncId] = {};

                    temp.url = r.uri;
                    temp.type = r.type;
                }
            });

            content = content.replace(this.conf.resourcePlaceHolder, tpl.replace('map', JSON.stringify({
                res: ret
            }, null, 2)));
        } else {
            content = content.replace(this.conf.resourcePlaceHolder, '');
        }

        return content;
    }
});
