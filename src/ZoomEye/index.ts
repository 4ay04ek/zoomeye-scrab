import axios from "axios";
import { sleep } from "../helpers";

const REGION = "RU";
const PROTOCOLS_TO_CHECK = ["postgresql", "elasticsearch", "mongodb"];
const BASIC_SEARCH_URL = "https://www.zoomeye.org/api/search";
const BASIC_SEARCH_TOTAL_URL = "https://www.zoomeye.org/api/search_total";
const PAGE_SIZE = 50;

const formQuery = (from_days, to_days) => {
  let to = new Date();
  to.setDate(to.getDate() - to_days);
  let to_date = to.toISOString().substring(0, 10);

  let from = new Date();
  from.setDate(from.getDate() - from_days);
  let from_date = from.toISOString().substring(0, 10);

  console.log("ZoomEye scanning from " + from_date + " to " + to_date);

  return `(${PROTOCOLS_TO_CHECK.map((p) => `service:${p}`).join(
    " "
  )}) +country:${REGION} +after:"${from_date}" +before:"${to_date}"`;
};

type HostWithoutId = {
  organization: string;
  service: string;
  ip: string;
  date_added: Date;
};

export default async (from_days, to_days): Promise<HostWithoutId[]> => {
  let q = formQuery(from_days, to_days);
  let total = (
    await axios.get(BASIC_SEARCH_TOTAL_URL, {
      params: {
        q,
        page: 1,
      },
      headers: {
        "Cube-Authorization": process.env.ZOOMEYE_KEY,
      },
    })
  ).data.total;
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
  console.log("Total ZoomEye received " + raw.length);
  return raw.map((v) => ({
    ip: Array.isArray(v.ip) ? v.ip[0] : v.ip,
    organization: v.geoinfo.organization,
    service: v.portinfo.service,
    date_added: new Date(v.timestamp),
  }));
};
