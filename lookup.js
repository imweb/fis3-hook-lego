/**
 * 查找依赖
 * @author jerojiang
 * 
 *  默认最新 require('zepto') -> require('zepto/x.x.x/zepto')
 *  指定版本号 require('zepto@1.2.3') -> require('zepto/1.2.3')
 *  modules 目录覆盖 require('zepto') -> require('modules/zepto')
 */

var _ = fis.util,
    fs = _.fs,
    lego = fis.project.getProjectPath('lego_modules/'),
    mod = fis.project.getProjectPath('modules/'),
    compare = require('compare-version');



module.exports = function(id) {
    return getModule(id) || getLegoModule(id);
};


/**
 * 从 modules 目录获取模块
 * @param  {String} id 就是 require('zepto') 中的 zepto
 */
function getModule(id) {
    if (_.isFile(_(mod, id + '.js'))) {
        fis.log.debug('lego: get %s from <modules>', id);
        return id;
    }
    return null;
}


/**
 * 从 lego_modules 下获取模块
 * @param  {String} id 就是 require('zepto') 中的 zepto
 */
function getLegoModule(id) {
    var ver, versions, pkg, legoInfo, ret,
        tempId = id.split('@'),
        id = tempId[0];
        root = _(lego, id);


    fis.log.debug('lego: get %s from <lego_modules>', id);
    if (!_.isDir(root)) {
        return fis.log.error('lego: 找不到 lego 组件 %s 的目录', id);
    }

    if (ver = tempId[1]) {  // 指定版本号
        // ver = _(root, ver);
        if (!_.isDir(_(root, ver))) {
            return fis.log.error('lego: 找不到 lego 组件 %s 的对应的版本', id, tempId[1]);
        }
    } else {    // 默认最新
        versions = fs.readdirSync(root) || [];

        if (versions.length > 1) {
            versions = versions.sort(function(prev, cur) {
                return compare(prev, cur) <= 0;
            });
        }

        ver = versions[0];
    }

    pkg = _(root, ver, 'package.json');
    
    try {
        pkg = require(pkg);
        legoInfo = pkg.lego;
        ret = _(id, ver, legoInfo.main.replace(/\.js$/, ''));
    } catch(ex) {
        // 如果不存在 package.json
        
        fis.log.info('lego: 组件 %s 没有 package.json', id);

        if (_.isFile(_(root, ver, id + '.js'))) {   // zepto/x.x.x/zepto.js 同名文件
            ret = _(id, ver, id);
        } else if (_.isFile(_(root, ver, 'index.js'))) {    // zepto/x.x.x/index.js index 文件
            ret = _(id, ver, 'index');
        } else {
            fis.log.error('lego: 没有找到 %s 的主文件', id);
        }
    }
    
    
    return ret;
}