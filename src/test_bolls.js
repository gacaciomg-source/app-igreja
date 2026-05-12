const test = async () => {
  const url = `https://bolls.life/get-text/60/1/1/`;
  const res = await fetch(url);
  console.log(res.status);
  const data = await res.text();
  console.log(data);
};
test();
