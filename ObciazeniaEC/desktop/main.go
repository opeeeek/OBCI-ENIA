//go:build windows

// ObciążeniaEC – wersja desktopowa (Windows, WebView2).
// Program osadza samodzielny plik dist/ObciazeniaEC.html, zapisuje go w %AppData%\ObciazeniaEC
// i otwiera w oknie WebView2 (dane projektu – localStorage w tym samym katalogu).
// Budowanie: zob. build-desktop.sh (wymaga Go ≥ 1.21; WebView2 Runtime jest częścią Windows 10/11).
package main

import (
	_ "embed"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	"github.com/jchv/go-webview2"
)

//go:embed app.html
var appHTML []byte

func msgBox(title, text string) {
	user32 := syscall.NewLazyDLL("user32.dll")
	mb := user32.NewProc("MessageBoxW")
	t, _ := syscall.UTF16PtrFromString(title)
	m, _ := syscall.UTF16PtrFromString(text)
	mb.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x40)
}

func main() {
	base, err := os.UserConfigDir()
	if err != nil || base == "" {
		base = os.TempDir()
	}
	dir := filepath.Join(base, "ObciazeniaEC")
	_ = os.MkdirAll(dir, 0o755)
	page := filepath.Join(dir, "app.html")
	if err := os.WriteFile(page, appHTML, 0o644); err != nil {
		msgBox("ObciążeniaEC", "Nie można zapisać pliku aplikacji w:\n"+page+"\n\n"+err.Error())
		return
	}
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     os.Getenv("OEC_DEBUG") == "1",
		AutoFocus: true,
		DataPath:  filepath.Join(dir, "WebView2"),
		WindowOptions: webview2.WindowOptions{
			Title:  "ObciążeniaEC – zestawienie obciążeń wg Eurokodów",
			Width:  1440,
			Height: 900,
			Center: true,
			IconId: 1, // ikona z zasobu #1 (desktop/winres, rsrc_windows_amd64.syso)
		},
	})
	if w == nil {
		msgBox("ObciążeniaEC", "Nie można uruchomić komponentu Microsoft Edge WebView2.\n\nZainstaluj „WebView2 Runtime” (Evergreen) ze strony Microsoft albo otwórz plik ObciazeniaEC.html w przeglądarce Edge/Chrome.")
		return
	}
	defer w.Destroy()
	w.SetSize(1180, 720, webview2.HintMin)
	u := url.URL{Scheme: "file", Path: "/" + strings.ReplaceAll(page, "\\", "/")}
	w.Navigate(u.String())
	w.Run()
}
