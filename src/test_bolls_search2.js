const test = async () => {
  let res = await fetch(`https://bolls.life/get-search/NAA/?search=Deus`);
  console.log(res.status);
};
test();
