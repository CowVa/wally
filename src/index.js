const axios = require("axios");
const yaml = require("yaml")
const { join } = require("path")
const async = require("async")
const dayjs = require("dayjs");
const clashApi = require("./speedtest/ClashApi")
const fs = require("fs")
var validator = require('validator');

const sublist = yaml.parse(fs.readFileSync(join(__dirname, "./sub.yaml"), "utf8"))
const nodes = {
    proxies: [],
    "proxy-groups": [{
        name: "所有节点",
        type: "select",
        proxies: []
    }]
}
const proxies_map = {}

//异步队列
const queue = async.queue((fn, completed) => {
    fn().then(() => {
        completed()
    })
}, 200)
async function download(url) {
    try {
        const res = await axios({
            url,
            timeout: 30 * 1000
        })
        console.log(`下载 ${url} 成功`);
        return res.data
    } catch (error) {
        console.log(`下载 ${url} 失败`);
        return false
    }
}






function addProxieForMap(proxie) {
    if(proxie.type=="vless") return false
    if(typeof proxie.port != 'number') return false
    if(proxie.uuid && !validator.isUUID(proxie.uuid)) return false
    const { server, port, type } = proxie
    proxie.name = `${type}-${server}-${port}`
    proxies_map[proxie.name] = proxie;
}
function getSub(url) {
    return async function () {
        const data = await download(url)
        if (data) {
            try {
                const proxies = yaml.parse(data.replace(/!<str>/g, '')).proxies
                proxies.forEach(proxie => {
                    addProxieForMap(proxie)
                });
            } catch (error) {
                console.log(error);
            }
        }
    }
}

async function start() {
    const { proxies } = yaml.parse(fs.readFileSync("./nodes.yaml", "utf8"))
    proxies.forEach(proxie => {
       addProxieForMap(proxie)
    });
    console.log(`获取上一次抓取的节点，共${proxies.length}个`);
    try {
        const res = await axios({
            url: `https://api.github.com/repos/changfengoss/pub/contents/data/${dayjs().format('YYYY_MM_DD')}?ref=main`,
            timeout: 10 * 1000
        })
        res.data.forEach((file, index) => {
            const sub_url = file.download_url.endsWith(".yaml") ? file.download_url : `https://sub.xeton.dev/sub?target=clash&new_name=true&url=${file.download_url}&insert=false`
            console.log(`获取长风节点:${file.name}--${sub_url}`);
            queue.push(getSub(sub_url))
        });
    } catch (error) {
        console.log("更新长风的节点失败或未更新");
    }
    await queue.drain()

    sublist.forEach((sub, index) => {
        queue.push(getSub(sub.url))
    });
    await queue.drain()
  
    for (const key in proxies_map) {
        nodes.proxies.push(proxies_map[key])
        nodes["proxy-groups"][0].proxies.push(proxies_map[key].name)
    }
    
    fs.writeFileSync("./nodes.yaml", yaml.stringify(nodes))

   async function testConfig() {
        try {
            await clashApi.setConfigs(join(process.cwd(), "./nodes.yaml"))
        } catch (error) {
            const pattern = /^proxy \d{1,}/
            if(error.response&&error.response.data.message&&pattern.test(error.response.data.message)){
                const index=Number(error.response.data.message.split("proxy ")[1].split(":")[0])
                console.log(`代理${index}错误,可能是不支持的类型,删除此代理`,error.response.data.message);
                nodes.proxies.splice(index,1)
                nodes["proxy-groups"][0].proxies.splice(index,1)
                fs.writeFileSync("./nodes.yaml", yaml.stringify(nodes))
                console.log("重新测试配置文件");
                await testConfig()
                return
            }
            console.log(error);
        }
    }
    console.log("开始测试配置文件");

    await testConfig()
    console.log(nodes.proxies.length);

}
start()

