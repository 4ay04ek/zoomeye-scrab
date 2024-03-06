import axios from "axios";
import { sleep } from "../helpers";

const REGION = "RU";
const PROTOCOLS_TO_CHECK = ["elasticsearch", "mongodb", "postgresql"];
const PORTS_TO_CHECK = ["9200", "9300"];
const APPS_TO_CHECK = ["ElasticSearch", "PostgresQL", "MongoDB"];
const APPS_TO_EXCLUDE = ["Apache", "nginx"];
const BASIC_SEARCH_URL = "https://www.zoomeye.org/api/search";
const BASIC_SEARCH_TOTAL_URL = "https://www.zoomeye.org/api/search_total";
const PAGE_SIZE = 50;

const formQuery = (time_start, time_end) => {
  //console.log("ZoomEye scanning from " + time_start + " to " + time_end);

  return `(${PROTOCOLS_TO_CHECK.map((p) => `service:${p}`).join(
    " "
  )} ${PORTS_TO_CHECK.map((p) => `port:${p}`).join(
    " "
  )} ${APPS_TO_CHECK.map((p) => `app:"${p}"`).join(
    " "
  )}) ${APPS_TO_EXCLUDE.map((p) => `-app:"${p}"`).join(
        " "
    )} +country:${REGION} +after:"${time_start}" +before:"${time_end}"`;
};

const formDate = (minutes) => {
    let date = new Date(new Date(new Date().toISOString().substring(0, 10)));
    //date.setDate(date.getDate() - 3);
    date.setTime(date.getTime() - minutes * 60 * 1000);
    return `${date.toISOString().substring(0, 10)} ${date.getUTCHours()}:${date.getUTCMinutes()}`
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const MINUTES_IN_DAY = 24 * 60;

const func = async () => {
    let result = [];
  for (let minutes_ago = MINUTES_IN_DAY; minutes_ago > 0;) {
    let delay = minutes_ago;
    let total;
    let q;
    do {
        const start = formDate(minutes_ago), end = formDate(Math.max(minutes_ago - delay, 0));
        q = formQuery(start, end);
        console.log("Used query " + q)
        total = (
            await axios.get(BASIC_SEARCH_TOTAL_URL, {
            params: {
                q,
                page: 1,
            },
            headers: {
                "Cube-Authorization": process.env.ZOOMEYE_KEY,
            },
            }).then((r) => ([403, 429].includes(r.data.status) ? console.log("ZoomEye Error") : r || null))
        ).data.total;
        delay /= 2;
    } while (total > 400 && delay > 10);
    minutes_ago = minutes_ago - 2 * delay; 
    console.log("ZoomEye scanned " + total);
    let raw = [];
    for (let i in Array.from(Array(Math.min(Math.ceil(total / PAGE_SIZE), 8)))) {
        let response = await axios
        .get(BASIC_SEARCH_URL, {
            params: {
            q,
            page: parseInt(i) + 1,
            pageSize: PAGE_SIZE,
            },
            headers: {
            "Cube-Authorization": process.env.ZOOMEYE_KEY,
            },
        })
        .then((r) => ([403, 429].includes(r.data.status) ? console.log("ZoomEye Error") : r.data.matches || []));
        raw = [...raw, ...response];
        await sleep(1000);
    }
        console.log("ZoomEye received " + raw.length + '\n');
        result = [...result, ...raw.map((v) => ({
            ip: Array.isArray(v.ip) ? v.ip[0] : v.ip,
            organization: v.geoinfo.organization,
            scanned_service: v.portinfo.service,
            scanned_port: v.portinfo.port,
            date_added: new Date(),
        }))];
    }
    console.log("Before clean " + result.length);
    for (let i = 0; i < result.length; i++) {
        result[i] = await checkAndEnrichWithShodan(result[i]);
    }
    result = result.filter(v => v);
    console.log(result)
    console.log("Total got " + result.length);
};

const SHODAN_BASE_URL = "https://internetdb.shodan.io/"

const checkAndEnrichWithShodan = async (item) => {
    let details = (await axios.get(SHODAN_BASE_URL + item.ip).catch(r => r)).data;
    if (!details || details.detail) return null;
    details = {
        cpes: details.cpes,
        domains: details.hostnames
    }
    if (!PROTOCOLS_TO_CHECK.some(prot => details.cpes.some(cpe => cpe.includes(prot)))) return null;
    return {
        ...item,
        ...details
    }
}
