import fs from "fs";

import MerkleTree from "../test/merkletree";

async function main() {
  const whitelistFp = fs.readFileSync("./whitelist_week_3.json", "utf-8");
  const whitelistEntries = JSON.parse(whitelistFp);
  const target = "0x7901b69375DBE302163237e9E08063f3a5AfbF4f";

  // const target = `0x${randomString(40)}`;
  // const whitelistEntries = [
  //   target,
  //   `0x${randomString(40)}`,
  //   `0x${randomString(40)}`,
  //   `0x${randomString(40)}`,
  //   `0x${randomString(40)}`,
  //   `0x${randomString(40)}`,
  //   `0x${randomString(40)}`,
  //   `0x${randomString(40)}`,
  //   `0x${randomString(40)}`,
  // ];

  // console.log(whitelistEntries);

  const tree = new MerkleTree(whitelistEntries);
  console.log(`Root: ${tree.getHexRoot()}`);
  console.log("Proof:");
  console.log(tree.getProof(target));

  const layers = tree.layers;
  fs.writeFileSync("./merkleTree.json", JSON.stringify(layers));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
