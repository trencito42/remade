import { ingestAllFeeds } from "../src/features/ingestion/run";

const results = await ingestAllFeeds();
for (const result of results) {
  console.log(result.feedId, result.stored, result.duplicates, result.error ?? "ok");
}
