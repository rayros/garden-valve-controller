import { worker } from "./worker";
import cluster from 'cluster';
import { main } from "./main";

if (cluster.isPrimary) {
    main();
} else {
    worker();
}

