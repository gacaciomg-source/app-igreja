const test = async () => {
  let res = await fetch(`https://bolls.life/static/bolls/app/views/languages.html`);
  const data = await res.text();
  console.log(data.match(/Portuguese.*?(?=\<\/ul\>)/s));
};
test();
