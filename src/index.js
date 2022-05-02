const axios = require("axios");
const yaml = require("yaml")
const {join}=require("path")
const async=require("async")
const fs = require("fs")

const sublist=yaml.parse(fs.readFileSync(join(__dirname,"./sub.yaml"),"utf8"))
const nodes= {
     proxies: [],
     "proxy-groups": [{
        name: "所有节点",
        type: "select",
        proxies: []
    }]
}
const proxies_map={}

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

async function start() {
    sublist.forEach((sub,index) => {
       async function getSub() {
           const data= await download(sub.url)
           if(data){
               try {
                   const proxies=yaml.parse(data.replace(/!<str>/g, '')).proxies
                   proxies.forEach(proxie => {
                   const { server, port, type } = proxie
                   proxie.name=`${type}-${server}-${port}`
                   proxies_map[proxie.name] = proxie;
                   });
               } catch (error) {
                   console.log(error);
               }
           }
       }
       queue.push(getSub)
    });
   await queue.drain()
   for (const key in proxies_map) {
      nodes.proxies.push(proxies_map[key]) 
      nodes["proxy-groups"][0].proxies.push(proxies_map[key].name)   
   }
   console.log(nodes.proxies.length);
   fs.writeFileSync("./nodes.yaml",yaml.stringify(nodes))
}
start()

