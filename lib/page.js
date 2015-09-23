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

var LINE_BREAK = '\r',
    depMap = {},
    combineCache = {},
    _ = fis.util;

module.exports = function(file, ret, conf) {
    if (!(file && conf)) {
        return;
    }

    this.conf = _.assign({}, conf);
    this.file = file;
    this.ret = ret;
    this.init();
};


_.assign(module.exports.prototype, {
    init: function() {
        var analysis,
            content,
            resourceMap,
            self = this,
            ret = self.ret,
            conf = self.conf,
            file = self.file;

        analysis = self.analyzeHtmlDepsAndAsync();
        content = file.getContent();
        content = self.injectCss(content, analysis.cssDeps);

        if (conf.autoPack) {
            self.generatePackageFile(analysis.depMap);
        }

        resourceMap = self.generateSourceMap(analysis);
        content = self.injectResourceMap(content, resourceMap);
        if (conf.autoPack) {
            content = self.removePlaceholder(content);
            content = self.mergeInlineAssets(content);
        }

        file.setContent(content);

        if (file.useCache) {
            ret.pkg[file.subpath] = file;
        }
    },

    analyzeHtmlDepsAndAsync: function() {
        var self = this,
            ret = this.ret,
            file = self.file,
            conf = self.conf,
            asyncList = file.requires || [],
            pageRes = {},
            cssDeps = {},
            asyncDeps = [],
            pageDepMap = {};

        asyncList.forEach(function(asyncId) {
            if (conf.lib[asyncId]) {
                if (!depMap[asyncId]) { // 去重
                    depMap[asyncId] = self.calFileDepsFromId(asyncId, pageRes);
                }

                pageDepMap[asyncId] = depMap[asyncId];
            } else {
                if (!pageDepMap[asyncId]) {
                    pageDepMap[asyncId] = self.calFileDepsFromId(asyncId, pageRes);
                }
            }

            pageRes = _.merge(pageRes, pageDepMap[asyncId].deps);
            cssDeps = _.merge(cssDeps, pageDepMap[asyncId].cssDeps);
            asyncDeps = asyncDeps.concat(pageDepMap[asyncId].asyncDeps);
        });

        var actualAsyncDeps = {};

        asyncDeps.forEach(function(asyncDepId) {
            if (!pageRes[asyncDepId]) {
                actualAsyncDeps[asyncDepId] = ret.ids[asyncDepId];
            }
        });

        return {
            pageRes: pageRes,
            cssDeps: cssDeps,
            asyncDeps: actualAsyncDeps,
            depMap: pageDepMap // contains: deps, cssDeps, asyncDeps
        };
    },


    calFileDepsFromId: function(id, pageRes) {
        pageRes = pageRes || {};

        var curId,
            curFile,
            queue = [id],
            deps = {},
            asyncDeps = [],
            cssDeps = {},
            self = this,
            ret = self.ret,
            conf = self.conf;

        while (queue.length) {
            curId = queue.pop();

            if (pageRes[curId]) {
                continue;
            }

            curFile = ret.ids[curId];

            if (!curFile) {
                !conf.ignore[curId] && fis.log.notice(curId + ' is not exists!');
                continue;
            }


            if (curFile.isCssLike) {
                // todo handle css
                cssDeps[curId] = curFile;
                continue;
            }

            if (!curFile.isJsLike) {
                continue;
            }

            deps[curId] = curFile;
            if (curFile.requires && curFile.requires.length) {
                curFile.requires.forEach(function(depId) {
                    if (depId != curId && !deps[depId]) { // 加入 queue 继续查找
                        queue.unshift(depId);
                    }
                });
            }

            if (curFile.asyncs.length) {
                curFile.asyncs.forEach(function(asyncDepId) {
                    if (asyncDepId != curId && !deps[asyncDepId] && !asyncDeps[asyncDepId]) { // 去重
                        var asyncFile = ret.ids[asyncDepId];

                        if (!asyncFile) {
                            !conf.ignore[asyncDepId] && fis.log.notice(asyncDepId + ' is not exists!');
                            return;
                        }

                        asyncDeps.push(asyncDepId);
                        if (asyncFile.requires && asyncFile.requires.length) { // 异步文件中的依赖
                            asyncFile.requires.forEach(function(asyncDepId) {
                                var asyncDepFile = ret.ids[asyncDepId];

                                if (!asyncDepFile) {
                                    !conf.ignore[asyncDepId] && fis.log.notice(asyncDepId + ' is not exists!');
                                    return;
                                }

                                if (asyncDepFile.isCssLike) {
                                    cssDeps[asyncDepId] = asyncDepFile;
                                } else if (asyncDepFile.isJsLike) {
                                    asyncDeps.push(asyncDepId);
                                }
                            });
                        }
                    }
                });
            }
        }

        return {
            deps: deps,
            cssDeps: cssDeps,
            asyncDeps: asyncDeps
        };
    },

    injectCss: function(content, cssDeps) {
        var cssFile,
            html = '',
            self = this,
            conf = self.conf;

        Object.keys(cssDeps).forEach(function(cssId) {
            cssFile = cssDeps[cssId];

            if (conf.autoPack && conf.cssInline) {
                html += '<style>' + cssFile.getContent() + '</style>' + LINE_BREAK;
            } else {
                html += '<link rel="stylesheet" type="text/css" href="' + self._getUri(cssId) + '">' + LINE_BREAK;
            }
        });

        if (content.indexOf(conf.stylePlaceHolder) !== -1) {
            content = content.replace(conf.stylePlaceHolder, html);
        } else {
            content = content.replace(/<\/head>/, html + LINE_BREAK);
        }

        return content;
    },

    _getUri: function(id) {
        return this.ret.map.res[id].uri;
    },

    generatePackageFile: function(depMap) {
        var deps,
            has,
            content,
            subpath,
            pkgFile,
            combinedId,
            self = this,
            ret = self.ret,
            conf = self.conf;

        Object.keys(depMap).forEach(function(id) {
            if (combineCache[id]) { // 去重
                return;
            }

            deps = depMap[id].deps;
            content = '';
            has = Object.keys(deps);

            has.forEach(function(fid, index) {
                var f = ret.ids[fid],
                    c = f.getContent() || '';

                if (index > 0) {
                    content += LINE_BREAK + ';';
                }

                content += c;
            });

            subpath = conf.output.replace('${id}', id);
            pkgFile = fis.file(fis.project.getProjectPath(), subpath);
            pkgFile.setContent(content);
            ret.pkg[pkgFile.subpath] = pkgFile;
            combinedId = id + '.min';

            ret.map.pkg[combinedId] = {
                uri: pkgFile.getUrl(/*opt.hash, opt.domain*/),
                type: 'js',
                has: has
            };
            combineCache[id] = true;
        });
    },

    generateSourceMap: function(analysis) {
        var deps,
            resourceMap = {
                res: {},
                pkg: {}
            },
            self = this,
            ret = self.ret,
            conf = self.conf;

        if (conf.autoPack) {
            Object.keys(analysis.depMap).forEach(function(p, index) {
                var combinedId = p + '.min',
                    depDict = analysis.depMap[p].deps,
                    pName = 'p' + index;

                Object.keys(depDict).forEach(function(fid) {
                    resourceMap.res[fid] = {
                        // deps: depDict[fid].requires,
                        pkg: pName
                    };

                    deps = self.generateJSDepList(fid);

                    if (deps.length) {
                        resourceMap.res[fid].deps = deps;
                    }
                });

                resourceMap.pkg[pName] = {
                    url: ret.map.pkg[combinedId].uri
                }; // todo do i need to add deps?
            });

        } else {
            Object.keys(analysis.pageRes).forEach(function(depId) {
                resourceMap.res[depId] = {
                    url: self._getUri(depId)
                };
                deps = self.generateJSDepList(depId);

                if (deps.length) {
                    resourceMap.res[depId].deps = deps;
                }
            });
        }

        // process asyncMap
        Object.keys(analysis.asyncDeps).forEach(function(asyncId) {
            resourceMap.res[asyncId] = {
                url: self._getUri(asyncId)
            };
            deps = self.generateJSDepList(asyncId);

            if (deps.length) {
                resourceMap.res[asyncId].deps = deps;
            }
        });

        return resourceMap;
    },

    /**
     * 生成一个文件的 js 依赖
     * @param id
     * @returns {Array}
     */
    generateJSDepList: function(id) {
        var ret = this.ret,
            file = ret.ids[id],
            list = [];

        if (file.requires && file.requires.length) {
            file.requires.forEach(function(r) {
                var rFile = ret.ids[r];

                if (rFile.isJsLike) {
                    list.push(r);
                }
            });
        }

        return list;
    },

    injectResourceMap: function(content, resourceMap) {
        var conf = this.conf,
            html = this.modJsCodeGen(resourceMap);

        if (content.indexOf(conf.resourcePlaceHolder) !== -1) {
            content = content.replace(conf.resourcePlaceHolder, html);
        } else {
            content = content.replace(/<\/body>/, html + LINE_BREAK);
        }

        return content;
    },

    modJsCodeGen: function(map) {
        return '<script>require.resourceMap(' + JSON.stringify(map, null, this.conf.autoPack ? null : 4) + ');</script>';
    },

    removePlaceholder: function(content) {
        var conf = this.conf;

        return content.replace(conf.scriptPlaceHolder, '')
            .replace(conf.stylePlaceHolder, '')
            .replace(conf.resourcePlaceHolder, '');
    },

    mergeInlineAssets: function(content) {
        return content.replace(/([^\>])\s*<\/script>\s*<script(\s+type="text\/javascript"\s*)?>\s*/g, '$1;')
            .replace(/<\/style>\s*<style>/g, '')
            .replace(/\s*\n\s*/g, '\n');
    }
});
