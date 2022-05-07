const yaml = require("yaml")
const fs = require("fs")
const { join } = require("path")
const async = require("async")
const clashApi = require("./ClashApi")
const { proxies } = yaml.parse(fs.readFileSync("./nodes.yaml", "utf8"))
//异步队列
const queue = async.queue((fn, completed) => {
    fn().then(() => {
        completed()
    })
}, 200)

function speedtest(proxie) {
    return async () => {
        try {
            const res = await clashApi.getDelay(proxie.name, 200)
            nodes.proxies.push(proxie)
            nodes["proxy-groups"][0].proxies.push(proxie.name)
            console.log(`节点${proxie.name} 延时${res.data.delay}`);
        } catch (error) {
            console.log(`节点${proxie.name}网络错误或超时，剔除此节点`);
        }
    }
}
const nodes = {
    proxies: [],
    "proxy-groups": [{
        name: "所有节点",
        type: "select",
        proxies: []
    }]
}
//休眠函数
function sleep(timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, timeout);
    })
}
async function start() {
    try {
        await clashApi.setConfigs(join(process.cwd(), "./nodes.yaml"))
        await sleep(2000)
        proxies.forEach(proxie => {
            queue.push(speedtest(proxie))
        });
        await queue.drain()
        console.log(nodes.proxies.length);
        fs.writeFileSync("./speedtest.yaml", yaml.stringify(nodes))
    } catch (error) {
        console.log(error);
    }


}
start()