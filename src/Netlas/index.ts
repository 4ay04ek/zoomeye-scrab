import axios from "axios";
import { sleep } from "../helpers";

const REGION = "RU";
const PROTOCOLS_TO_CHECK = ["postgres", "postgresssl", "elasticsearch", "mongodb"];
const BASIC_SEARCH_URL = "https://app.netlas.io/api/responses/";
const BASIC_SEARCH_TOTAL_URL = "https://app.netlas.io/api/responses_count/";
const PAGE_SIZE = 20;

const formQuery = () => {
  let today = new Date();
  let from = new Date();
  from.setDate(from.getDate() - 7);
  return `(${PROTOCOLS_TO_CHECK.map((p) => `protocol:${p}`).join(
    " OR "
  )}) AND geo.country:${REGION} AND whois.net.country:${REGION} AND last_updated:[${from
    .toISOString()
    .substring(0, 10)} TO ${today.toISOString().substring(0, 10)}]`;
};

type HostWithoutId = {
  organization: string;
  service: string;
  ip: string;
  date_added: Date;
};

export default async (): Promise<HostWithoutId[]> => {
  let q = formQuery();
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
  ).data.count;
  console.log("Total Netlas scanned " + total);
  let raw = [];
  for (let i in Array.from(Array(Math.ceil(total / PAGE_SIZE)))) {
    await axios
      .get(BASIC_SEARCH_URL, {
        params: {
          q,
          page: parseInt(i) + 1,
        },
      })
      .then((r) => r.data.items || [])
      .then((r) => raw.push(r));
    await sleep(1000);
  }
  let r: any[] = [];
  raw.forEach((v_arr: any[]) => v_arr.forEach((v) => r.push(v.data)));
  console.log("Total Netlas received " + r.length);
  return r.map((v) => ({
    ip: v.ip,
    organization: v.whois.net.organization,
    service: v.protocol,
    date_added: new Date(),
  }));
};
