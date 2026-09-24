import { useEffect, useState } from "react";
import { api } from "./api";
export function useApi(path, { auth = false } = {}) {
  const [state, setState] = useState({ data: null, error: "", loading: true }),
    [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) {
      setState({ data: null, error: "", loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ data: null, error: "", loading: true });
    api
      .get(path, { auth, signal: controller.signal })
      .then((data) => setState({ data, error: "", loading: false }))
      .catch((e) => {
        if (e.name !== "AbortError")
          setState({ data: null, error: e.message, loading: false });
      });
    return () => controller.abort();
  }, [path, auth, version]);
  return { ...state, reload: () => setVersion((v) => v + 1) };
}
export const elementColors = {
  Pyro: "#ff806e",
  Hydro: "#70baff",
  Electro: "#bf98ff",
  Cryo: "#92e5e5",
  Dendro: "#a6dc78",
  Anemo: "#75d9bb",
  Geo: "#e7c17a",
  Adaptive: "#a8b5d1",
};
export function formatStat(stat) {
  if (stat?.value == null) return "—";
  return `${Number(stat.value).toLocaleString(undefined, { maximumFractionDigits: stat.percent ? 1 : 0 })}${stat.percent ? "%" : ""}`;
}
