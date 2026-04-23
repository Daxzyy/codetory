import requests
import random
import string
import time
import json
import re

BASE_URL = "https://api.mail.tm"


def buat_akun():
    resp = requests.get(f"{BASE_URL}/domains")
    resp.raise_for_status()
    domain = resp.json()["hydra:member"][0]["domain"]

    username = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    password = "".join(random.choices(string.ascii_letters + string.digits, k=12))
    email = f"{username}@{domain}"

    payload = {"address": email, "password": password}

    resp = requests.post(f"{BASE_URL}/accounts", json=payload)
    resp.raise_for_status()

    resp = requests.post(f"{BASE_URL}/token", json=payload)
    resp.raise_for_status()
    token = resp.json()["token"]

    return email, password, token


def cek_inbox(token):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/messages", headers=headers)
    resp.raise_for_status()
    return resp.json()["hydra:member"]


def baca_pesan(token, message_id):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/messages/{message_id}", headers=headers)
    resp.raise_for_status()
    return resp.json()


def tampilkan_pesan(pesan):
    print("\n" + "=" * 60)
    print(f"  DARI    : {pesan.get('from', {}).get('address', '-')}")
    print(f"  SUBJEK  : {pesan.get('subject', '(tanpa subjek)')}")
    print(f"  WAKTU   : {pesan.get('createdAt', '-')}")
    print("=" * 60)

    body = pesan.get("text") or pesan.get("html", "")

    if isinstance(body, list):
        body = " ".join(body)

    body = re.sub(r"<[^>]+>", "", body).strip()

    print(body[:2000])
    print("=" * 60)


def main():
    print("╔══════════════════════════════════════╗")
    print("║   TEMP EMAIL GENERATOR — mail.tm     ║")
    print("╚══════════════════════════════════════╝\n")

    print("⏳ Membuat akun temp email...")

    try:
        email, password, token = buat_akun()
    except Exception as e:
        print(f"❌ Gagal membuat akun: {e}")
        return

    print("✅ Email siap digunakan!\n")
    print(f"   📧 Email   : {email}")
    print(f"   🔑 Password: {password}")
    print("\n💡 Gunakan email ini untuk daftar di website lain.")
    print("   Tekan ENTER untuk cek inbox, atau ketik 'q' untuk keluar.\n")

    pesan_sudah_dibaca = set()

    while True:
        cmd = input(">> ENTER refresh inbox (q keluar): ").strip().lower()

        if cmd == "q":
            print("👋 Selesai.")
            break

        print("📬 Mengecek inbox...")

        try:
            messages = cek_inbox(token)
        except Exception as e:
            print(f"❌ Gagal cek inbox: {e}")
            continue

        if not messages:
            print("Inbox kosong.")
            continue

        print(f"\nAda {len(messages)} email:\n")

        for i, msg in enumerate(messages, 1):
            tanda = "🆕" if msg["id"] not in pesan_sudah_dibaca else "✉️"
            print(f"[{i}] {tanda} {msg.get('from', {}).get('address', '-')}")
            print(f"    {msg.get('subject', '(tanpa subjek)')}")

        print()

        pilih = input("Nomor email (ENTER skip): ").strip()
        if not pilih:
            continue

        try:
            idx = int(pilih) - 1
            msg_id = messages[idx]["id"]

            detail = baca_pesan(token, msg_id)
            tampilkan_pesan(detail)

            pesan_sudah_dibaca.add(msg_id)

        except (ValueError, IndexError):
            print("Nomor tidak valid.")
        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()