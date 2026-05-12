const test = async () => {
  let res = await fetch(`https://bolls.life/api/v1/search/60/?search=Deus`);
  console.log(res.status);
};
test();
