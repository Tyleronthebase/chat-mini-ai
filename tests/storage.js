const { loadMessages, saveMessages, deleteSession } = require("../src/storage");

async function run() {
  const testSessionId = "test-session-001";
  const sample = [
    { role: "user", content: "你好" },
    { role: "assistant", content: "你好，我在。" }
  ];
  await saveMessages(testSessionId, sample);
  const loaded = await loadMessages(testSessionId);
  if (!Array.isArray(loaded) || loaded.length !== sample.length) {
    throw new Error("Storage load/save failed");
  }
  // clean up
  await deleteSession(testSessionId);
  const afterDelete = await loadMessages(testSessionId);
  if (afterDelete.length !== 0) {
    throw new Error("Storage delete failed");
  }
  console.log("storage ok");
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
