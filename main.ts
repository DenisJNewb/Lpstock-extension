let table = document.querySelector("table")!;
let theadTr = table.querySelector("thead tr");
let tbodyTr = [...table.querySelectorAll("tbody tr")] as HTMLTableRowElement[];

const addHeader = (headerName: string): void => {
  const newHeader = document.createElement("th");
  newHeader.innerText = headerName;
  theadTr?.appendChild(newHeader);
};

const parsePrice = (text: string): number => {
  const matches = text.match(/(\d+[\.\d]*)\s*(\w)/)!;
  const char = matches[2];
  let price = parseFloat(matches[1]);
  if (char == "M") price *= 1_000_000;
  else if (char == "K") price *= 1_000;
  return price;
};

const scalePrice = (price: number): string => {
  let ch = "";
  while (price / 1_000 >= 1) {
    if (ch == "") ch = "K";
    else if (ch == "K") ch = "M";
    else if (ch == "M") ch = "B";
    else throw Error("Unexpected");
    price /= 1_000;
  }
  return `${price} ${ch}`;
};

const addBr = (parent: Element): void => {
  const br = document.createElement("br");
  parent.appendChild(br);
};

const getInt = (element: HTMLElement): number => {
  return parseInt(element.innerText.replace(/\D/g, ""), 10);
};

const parseReqs = (p: HTMLParagraphElement): IReq[] => {
  const rawText = p.textContent!.replace("Requirements: ", "");
  const reqs = rawText
    .split("ISK")
    .filter((r) => r)
    .map((rawReq) => {
      const split = rawReq.split("-").map((r) => r.trim());
      let name = split[0];
      let count = 1;
      const nameMatches = name.match(/\s*\((\d+)\)$/);
      if (nameMatches) {
        name = name.replace(nameMatches[0], "");
        count = parseInt(nameMatches[1]);
      }
      return { name, count, price: split[1] };
    });
  return reqs;
};

const multReqs = (reqs: IReq[], count: number): IReq[] => {
  return reqs.map((r) => ({
    name: r.name,
    count: r.count * count,
    price: scalePrice(parsePrice(r.price) * count),
  }));
};

const buildReqDivs = (reqs: IReq[]): HTMLDivElement[] => {
  return reqs.map((req) => {
    const parentDiv = document.createElement("div");
    parentDiv.style.display = "flex";
    parentDiv.style.gap = "10px";
    const nameSpan = document.createElement("span");
    nameSpan.innerText = req.name;
    parentDiv.appendChild(nameSpan);
    const countSmall = document.createElement("small");
    countSmall.className = "text-info";
    countSmall.innerText = req.count.toString();
    parentDiv.appendChild(countSmall);
    const priceSpan = document.createElement("span");
    priceSpan.className = "label label-warning";
    priceSpan.innerText = req.price;
    parentDiv.appendChild(priceSpan);
    return parentDiv;
  });
};

const refillMultDiv = (parent: HTMLDivElement, reqs: IReq[]): void => {
  parent.innerHTML = "";
  buildReqDivs(reqs).forEach((req) => parent.appendChild(req));
};

const refillResultPriceDiv = (
  parent: HTMLDivElement,
  sellPrice: number,
  basePrice: number,
  reqs: IReq[]
): void => {
  const reqsPrice = getReqsPrice(reqs);
  const resultPrice = sellPrice - basePrice - reqsPrice;
  parent.innerText = `Profit = ${scalePrice(sellPrice)} - ${scalePrice(
    basePrice
  )} - ${scalePrice(reqsPrice)} = ${scalePrice(resultPrice)}`;
};

const getReqsPrice = (reqs: IReq[]): number => {
  let total = 0;
  reqs.forEach((r) => (total += parsePrice(r.price)));
  return total;
};

const setupTr = (tr: HTMLTableRowElement): void => {
  const corporationTD = tr.querySelector("td")!;
  const itemTD = tr.querySelector("td:nth-child(2)")!;
  const costTD = tr.querySelector("td:nth-child(3)")!;
  addBr(corporationTD);
  addBr(itemTD);
  addBr(costTD);

  // Corp TD
  const countInput = document.createElement("input");
  countInput.style.maxWidth = "70px";
  corporationTD.appendChild(countInput);
  // Corp TD />

  // Item TD
  const sellSpan = itemTD.querySelector("span")!;
  const multSellSpan = sellSpan.cloneNode(true) as HTMLSpanElement;
  itemTD.appendChild(multSellSpan);

  const sellPrice = parsePrice(sellSpan.innerText);
  // Item TD />

  // Cost TD
  const sepDiv = document.createElement("div");
  sepDiv.style.borderTop = "1px solid";
  sepDiv.style.margin = "10px 0";
  costTD.appendChild(sepDiv);

  const baseLPSpan = costTD.querySelector("span")!;
  const multLPSpan = baseLPSpan.cloneNode(true) as HTMLSpanElement;
  costTD.appendChild(multLPSpan);

  const basePriceSpan = costTD.querySelector("span:nth-child(2)")!;
  const multBasePriceSpan = basePriceSpan.cloneNode() as HTMLSpanElement;
  costTD.appendChild(multBasePriceSpan);

  const fakeReqsP = costTD.querySelector("p");
  let reqs: IReq[] | null = null;
  let reqsMultDiv: HTMLDivElement | null = null;

  if (fakeReqsP) {
    fakeReqsP.style.display = "none";

    const reqsP: HTMLParagraphElement = costTD.querySelector("p:nth-child(4)")!;
    reqsP.style.display = "block";

    reqs = parseReqs(reqsP);

    reqsMultDiv = document.createElement("div");
    costTD.appendChild(reqsMultDiv);
  }

  const resultPriceMultDiv = document.createElement("div");
  resultPriceMultDiv.className = "label label-warning";
  costTD.appendChild(resultPriceMultDiv);

  const baseLP = getInt(baseLPSpan);
  const basePrice = parsePrice(basePriceSpan.innerHTML);
  // Cost TD />

  const setVisibility = (visible: boolean): void => {
    const setVis = (e: HTMLElement): void => {
      e.style.visibility = visible ? "visible" : "collapse";
    };
    setVis(sepDiv);
    setVis(multSellSpan);
    setVis(multLPSpan);
    setVis(multBasePriceSpan);
    if (reqsMultDiv) {
      setVis(reqsMultDiv);
      setVis(resultPriceMultDiv!);
    }
  };

  setVisibility(false);

  countInput.oninput = () => {
    const count = parseInt(countInput.value, 10);

    if (isNaN(count) || count < 2) {
      setVisibility(false);
      return;
    }

    const sellPriceMult = sellPrice * count;
    multSellSpan.innerText = scalePrice(sellPriceMult);

    const baseLPMult = baseLP * count;
    multLPSpan.innerText = baseLPMult.toLocaleString();

    const basePriceMult = basePrice * count;
    multBasePriceSpan.innerText = scalePrice(basePriceMult);

    if (reqs) {
      const reqsMult = multReqs(reqs, count);
      refillMultDiv(reqsMultDiv!, reqsMult);
      refillResultPriceDiv(
        resultPriceMultDiv,
        sellPriceMult,
        basePriceMult,
        reqsMult
      );
    } else {
      refillResultPriceDiv(
        resultPriceMultDiv,
        sellPriceMult,
        basePriceMult,
        []
      );
    }

    setVisibility(true);
  };
};

tbodyTr.forEach(setupTr);

interface IReq {
  name: string;
  count: number;
  price: string;
}
