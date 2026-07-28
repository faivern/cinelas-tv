import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isTvMode } from "../../lib/tv/tvMode";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // TV: scrolling is driven entirely by focus (spatialNavigation centers
    // the focused element; focus restore jumps straight to the remembered
    // card). Scrolling to top here would fight that restore and win.
    if (isTvMode()) return;
    window.scrollTo(0, 0);
  }, [pathname]);
    return null;
};

export default ScrollToTop;
