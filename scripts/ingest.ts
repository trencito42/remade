import { ingestAllEnabledFeeds } from "../src/features/ingestion/service";

async function main() {
  console.log("Starting Dispatch Feed Ingestion...");
  const results = await ingestAllEnabledFeeds();

  let totalFetched = 0;
  let totalStored = 0;
  let totalDuplicates = 0;
  let totalClustered = 0;

  for (const result of results) {
    totalFetched += result.fetched;
    totalStored += result.stored;
    totalDuplicates += result.duplicates;
    totalClustered += result.clustered;

    const status = result.error ? `ERROR: ${result.error}` : "OK";
    console.log(
      `[Feed ${result.feedId.slice(0, 8)}] Fetched: ${result.fetched} | Stored: ${result.stored} | Dups: ${result.duplicates} | Clustered: ${result.clustered} -> ${status}`,
    );
  }

  console.log("------------------------------------------");
  console.log(
    `Ingestion Complete. Feeds: ${results.length} | Stored: ${totalStored} | Duplicates: ${totalDuplicates} | Clustered: ${totalClustered}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  });
