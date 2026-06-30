const wyomingCities = [
  "Afton", "Baggs", "Basin", "Big Piney", "Bondurant",
  "Buffalo", "Burns", "Carpenter", "Casper", "Centennial",
  "Cheyenne", "Cody", "Cora", "Cowley", "Douglas",
  "Dubois", "Encampment", "Evanston", "Fort Laramie", "Freedom",
  "Frontier", "Gillette", "Glenrock", "Granite Canon", "Green River",
  "Greybull", "Grover", "Hudson", "Hulett", "Jackson",
  "Kaycee", "Kemmerer", "Lander", "Laramie", "Lovell",
  "Lusk", "Mills", "Moorcroft", "Newcastle", "Pavillion",
  "Pinedale", "Powell", "Ranchester", "Rawlins", "Riverton",
  "Rock Springs", "Saratoga", "Shell", "Sheridan", "Story",
  "Sundance", "Teton Village", "Thermopolis", "Torrington", "Wapiti",
  "Wheatland", "Wilson", "Worland", "Yellowstone National Park",
];

const BATCH_SIZE = 5;

const batches = {};
for (let i = 0; i < wyomingCities.length; i++) {
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  if (!batches[batchNum]) batches[batchNum] = [];
  batches[batchNum].push(wyomingCities[i]);
}

module.exports = { batches };
