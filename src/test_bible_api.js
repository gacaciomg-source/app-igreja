const test = async () => {
  const url = `https://bible-api.com/`;
  const res = await fetch(url);
  const data = await res.text();
  const tr = data.match(/<tbody>(.*?)<\/tbody>/g);
  if (tr) {
    console.log(tr[1]);
  }
};
test();
