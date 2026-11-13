"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { rastreamento } from "@/lib/site";

const { gtm, metaPixel } = rastreamento;

// Trechos oficiais do Google Tag Manager e do Meta Pixel, como o gestor de tráfego enviou.
const scriptGtm = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtm}');`;

const scriptPixel = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixel}');
fbq('track', 'PageView');`;

type ComFbq = Window & { fbq?: (...args: unknown[]) => void };

/**
 * Google Tag Manager e Meta Pixel no site público (fora do painel). O layout só o inclui no
 * domínio de produção (`rastreamentoAtivo`). A navegação do Next não recarrega a página, então
 * o PageView do Pixel é repetido a cada troca de caminho; o GTM trata isso pelos próprios
 * acionadores de histórico.
 */
export function Rastreamento() {
  const caminho = usePathname();
  const primeiro = useRef(caminho);
  const noPainel = caminho.startsWith("/painel");

  useEffect(() => {
    if (noPainel || caminho === primeiro.current) return;
    primeiro.current = caminho;
    (window as ComFbq).fbq?.("track", "PageView");
  }, [caminho, noPainel]);

  if (noPainel) return null;
  return (
    <>
      <Script id="gtm" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: scriptGtm }} />
      <Script id="meta-pixel" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: scriptPixel }} />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${metaPixel}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
