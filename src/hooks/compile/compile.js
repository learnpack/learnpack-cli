module.exports = async function (opts) {
  process.stdout.write(`example hook running\n`)
  console.log("main cli", opts)
}
