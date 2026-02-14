const { streamReply } = require("../src/chat");

async function run() {
  let reply = "";
  for await (const chunk of streamReply([{ role: "user", content: "你好" }], { useRemote: false })) {
    if (typeof chunk !== "string") {
      throw new Error("Expected string chunk");
    }
    reply += chunk;
  }
  if (!reply) {
    throw new Error("Expected non-empty reply");
  }
  console.log("smoke ok");
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
