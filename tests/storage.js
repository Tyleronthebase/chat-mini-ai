const { loadMessages, saveMessages } = require("../src/storage");

async function run() {
  const sample = [
    { role: "user", content: "你好" },
    { role: "assistant", content: "你好，我在。" }
  ];
  await saveMessages(sample);
  const loaded = await loadMessages();
  if (!Array.isArray(loaded) || loaded.length !== sample.length) {
    throw new Error("Storage load/save failed");
  }
  console.log("storage ok");
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
