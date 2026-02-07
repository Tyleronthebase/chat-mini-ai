const { generateReply } = require("../src/chat");

async function run() {
  const reply = await generateReply([{ role: "user", content: "你好" }], { useRemote: false });
  if (!reply || typeof reply !== "string") {
    throw new Error("Expected string reply");
  }
  console.log("smoke ok");
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
