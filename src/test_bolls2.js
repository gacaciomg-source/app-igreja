const test = async () => {
  let url = `https://bolls.life/get-text/NVPT/1/1/`;
  let res = await fetch(url);
  console.log(res.status);
  console.log(await res.text());

  url = `https://bolls.life/get-text/NVI/1/1/`;
  res = await fetch(url);
  console.log(res.status);
  console.log(await res.text());

};
test();
