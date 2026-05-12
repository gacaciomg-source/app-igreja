const test = async () => {
  let res = await fetch(`https://bolls.life/`);
  console.log('home', res.status, (await res.text()).indexOf('ACF'));
};
test();
