import axios from "axios";
import { sleep } from "../helpers";

const REGION = "RU";
const PROTOCOLS_TO_CHECK = ["elasticsearch", "mongodb", "postgresql"];
const BASIC_SEARCH_URL = "https://www.zoomeye.org/api/search";
const BASIC_SEARCH_TOTAL_URL = "https://www.zoomeye.org/api/search_total";
const PAGE_SIZE = 50;

const formQuery = (time_start, time_end) => {
  console.log("ZoomEye scanning from " + time_start + " to " + time_end);

  return `(${PROTOCOLS_TO_CHECK.map((p) => `service:${p}`).join(
    " "
  )}) +country:${REGION} +after:"${time_start}" +before:"${time_end}"`;
};

const formDate = (hours) => {
    let date = new Date(new Date(new Date().toISOString().substring(0, 10)));
    date.setTime(date.getTime() - hours * 60 * 60 * 1000);
    return `${date.toISOString().substring(0, 10)} ${date.getUTCHours()}:00`
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const func = async () => {
    let result = [];
  for (let hours_ago = 24; hours_ago > 0; hours_ago -= 1) {
    const start = formDate(hours_ago), end = formDate(hours_ago - 1);
    let q = formQuery(start, end);
    console.log("Used query " + q)
    let total = (
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
    if (!total) continue;
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
        if (response) raw = [...raw, ...response];
        await sleep(1000);
    }
        result = [...result, ...raw.map((v) => ({
            ip: Array.isArray(v.ip) ? v.ip[0] : v.ip,
            organization: v.geoinfo.organization,
            service: v.portinfo.service,
            date_added: new Date(v.timestamp),
        }))];
    }
    console.log(result);
    console.log("Total get " + result.length);
};
