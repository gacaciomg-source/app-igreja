const test = async () => {
  let res = await fetch(`https://bolls.life/search/NAA/?search=Deus`);
  console.log(res.status, await res.text());
};
test();
