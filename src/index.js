const axios = require("axios");
const yaml = require("yaml")
const { join } = require("path")
const async = require("async")
const dayjs = require("dayjs");
const fs = require("fs")

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




function getSub(url) {
    return async function () {
        const data = await download(url)
        if (data) {
            try {
                const proxies = yaml.parse(data.replace(/!<str>/g, '')).proxies
                proxies.forEach(proxie => {
                    const { server, port, type } = proxie
                    proxie.name = `${type}-${server}-${port}`
                    proxies_map[proxie.name] = proxie;
                });
            } catch (error) {
                console.log(error);
            }
        }
    }
}

async function start() {


    sublist.forEach((sub, index) => {
        queue.push(getSub(sub.url))
    });
    await queue.drain()
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



    for (const key in proxies_map) {
        nodes.proxies.push(proxies_map[key])
        nodes["proxy-groups"][0].proxies.push(proxies_map[key].name)
    }
    console.log(nodes.proxies.length);
    fs.writeFileSync("./nodes.yaml", yaml.stringify(nodes))
}
start()

