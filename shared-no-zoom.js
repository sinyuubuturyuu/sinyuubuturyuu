(function () {
  function preventZoomGesture(event) {
    event.preventDefault();
  }

  function preventPinchTouchMove(event) {
    if (typeof event.scale === "number" && event.scale !== 1) {
      event.preventDefault();
    }
  }

  function preventCtrlWheelZoom(event) {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  }

  function disableZoom() {
    document.addEventListener("gesturestart", preventZoomGesture, { passive: false });
    document.addEventListener("gesturechange", preventZoomGesture, { passive: false });
    document.addEventListener("gestureend", preventZoomGesture, { passive: false });
    document.addEventListener("touchmove", preventPinchTouchMove, { passive: false });
    document.addEventListener("wheel", preventCtrlWheelZoom, { passive: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", disableZoom, { once: true });
  } else {
    disableZoom();
  }
})();
