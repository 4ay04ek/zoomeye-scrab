import "dotenv/config";
import { AppDataSource } from "./data-source";
import ZoomEye from "./ZoomEye";
import { Host } from "./entity/Host";
import Netlas from "./Netlas";
import { sleep } from "./helpers";

(async () => {
  for (let i in Array.from(Array(6))) {
    let n = parseInt(i);
    await ZoomEye(n + 1, n).then((r) => {
      r.forEach(async (item) => {
        AppDataSource.getRepository(Host).save(item);
      });
    });
  }
})();

/*
Netlas().then((r) => {
  r.forEach(async (item) => {
    AppDataSource.getRepository(Host).save(item);
  });
});
*/
