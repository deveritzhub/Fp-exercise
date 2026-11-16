"""Gebruik:
    python -m jarvis                 interactieve chat in de terminal
    python -m jarvis web [--port N]  webinterface op http://127.0.0.1:8000
    python -m jarvis notitie "..."   snel iets vastleggen
    python -m jarvis vraag "..."     eenmalige vraag
"""

from __future__ import annotations

import argparse
import sys

from .brain import HELP, Jarvis


def repl(j: Jarvis) -> None:
    print(f"🤖 {j.s.name} staat klaar ({j.provider_name}). Kluis: {j.s.vault}")
    print("Typ /help voor commando's, Ctrl+C om te stoppen.\n")
    while True:
        try:
            text = input("jij › ")
        except (EOFError, KeyboardInterrupt):
            print("\nTot later! 👋")
            return
        if not text.strip():
            continue
        print(f"{j.s.name.lower()} › ", end="", flush=True)
        for piece in j.handle(text):
            print(piece, end="", flush=True)
        print("\n")


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="jarvis", description="Je geheime tweede brein.")
    sub = p.add_subparsers(dest="cmd")
    w = sub.add_parser("web", help="start de webinterface")
    w.add_argument("--host", default="127.0.0.1")
    w.add_argument("--port", type=int, default=8000)
    n = sub.add_parser("notitie", help="snel iets vastleggen")
    n.add_argument("tekst", nargs="+")
    v = sub.add_parser("vraag", help="eenmalige vraag")
    v.add_argument("tekst", nargs="+")
    sub.add_parser("help")
    args = p.parse_args(argv)

    j = Jarvis()
    if args.cmd == "web":
        import uvicorn

        from .server import create_app

        if args.host not in ("127.0.0.1", "localhost") and not j.s.password:
            sys.exit("Stel eerst JARVIS_PASSWORD in voordat je Jarvis op het netwerk zet.")
        uvicorn.run(create_app(j), host=args.host, port=args.port)
    elif args.cmd == "notitie":
        print(f"📝 {j.vault.rel(j.vault.add_note(' '.join(args.tekst)))}")
    elif args.cmd == "vraag":
        for piece in j.handle(" ".join(args.tekst)):
            print(piece, end="", flush=True)
        print()
    elif args.cmd == "help":
        print(__doc__, HELP)
    else:
        repl(j)


if __name__ == "__main__":
    main()
