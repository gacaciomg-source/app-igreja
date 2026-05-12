const test = async () => {
  const url = `https://www.abibliadigital.com.br/api/verses/nvi/gn/1`;
  const res = await fetch(url);
  console.log(res.status);
  const data = await res.json();
  console.log(data);
};
test();
