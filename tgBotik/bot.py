import telebot
from telebot import types
import os
import requests
import re

import gspread
from google.oauth2.service_account import Credentials

from gspread_formatting import (
    CellFormat, TextFormat, Color, format_cell_range,
    set_frozen, set_data_validation_for_cell_range, DataValidationRule,
    BooleanCondition, NumberFormat,
    ConditionalFormatRule, BooleanRule, GridRange,
    get_conditional_format_rules, get_data_validation_rule,
    set_row_height, set_column_width
)

# Конфигурация Telegram бота
TOKEN = "7339998637:AAHlVZXgh2DLsGEGnZifAyHT-nUwqPwQ348"
CHANNEL_ID = "-1002383375291"   # В канал пересылаются только сообщения по сотрудничеству
OWNER_ID = 358205561
MODERATOR_IDS = [358205561]

bot = telebot.TeleBot(TOKEN)

# Храним состояние пользователя: None / "wait_video" / "wait_coop"
user_state = {}

# Глобальные переменные для запросов по сотрудничеству (команда /reply)
cooperation_requests = {}
next_coop_id = 1

# Конфигурация Google Sheets
SCOPES = ['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/drive']
creds = Credentials.from_service_account_file('credentials.json', scopes=SCOPES)
client = gspread.authorize(creds)
SPREADSHEET_ID = "1gtj6n66Wir5FjuuwjFuN9r4gumbJ0dDVaOW77GVyO8A"

# Конфигурация YouTube Data API
YOUTUBE_API_KEY = "AIzaSyDBoLSPOW0J--hS5YhvsIkoTXAQe0h_nP0"

# ------------------------------------------------------------------------------
# ФУНКЦИИ ИНИЦИАЛИЗАЦИИ ТАБЛИЦЫ, СОХРАНЕНИЯ ВИДЕО И Т.П.
# ------------------------------------------------------------------------------
def get_sheet():
    try:
        sheet = client.open_by_key(SPREADSHEET_ID).sheet1
        return sheet
    except Exception as e:
        print("Ошибка при открытии Google Sheets:", e)
        return None

def initialize_sheet(sheet):
    headers = ["ID", "Ссылка", "Название", "Просмотры", "Превью", "Статус"]
    sheet.append_row(headers, value_input_option="USER_ENTERED")
    set_frozen(sheet, rows=1)

    header_formats = {
        "A1": Color(0.8, 0.9, 1),
        "B1": Color(0.9, 1, 0.9),
        "C1": Color(1, 0.9, 0.8),
        "D1": Color(1, 1, 0.8),
        "E1": Color(0.9, 0.8, 1),
        "F1": Color(0.9, 0.9, 0.9)
    }
    for cell, bg_color in header_formats.items():
        fmt = CellFormat(
            textFormat=TextFormat(bold=True),
            backgroundColor=bg_color
        )
        format_cell_range(sheet, cell, fmt)

    set_column_width(sheet, 'E', 200)
    wrap_fmt = CellFormat(wrapStrategy="WRAP")
    format_cell_range(sheet, "C2:F1000", wrap_fmt)

    dv_rule = DataValidationRule(
        BooleanCondition('ONE_OF_LIST', ['не смотрел', 'смотрел', 'скипнул']),
        showCustomUi=True
    )
    set_data_validation_for_cell_range(sheet, "F2:F1000", dv_rule)

    number_fmt = NumberFormat(type="NUMBER", pattern="#,##0")
    format_cell_range(sheet, "D2:D1000", CellFormat(numberFormat=number_fmt))

    center_fmt = CellFormat(horizontalAlignment='CENTER')
    format_cell_range(sheet, "D2:D1000", center_fmt)

    sheet_id = sheet._properties['sheetId']
    rules = get_conditional_format_rules(sheet)
    rules.clear()

    red_rule = ConditionalFormatRule(
        ranges=[GridRange(sheetId=sheet_id,
                          startRowIndex=1, endRowIndex=1000,
                          startColumnIndex=0, endColumnIndex=6)],
        booleanRule=BooleanRule(
            condition=BooleanCondition('CUSTOM_FORMULA', ['=$F2="не смотрел"']),
            format=CellFormat(backgroundColor=Color(1, 0.8, 0.8))
        )
    )
    green_rule = ConditionalFormatRule(
        ranges=[GridRange(sheetId=sheet_id,
                          startRowIndex=1, endRowIndex=1000,
                          startColumnIndex=0, endColumnIndex=6)],
        booleanRule=BooleanRule(
            condition=BooleanCondition('CUSTOM_FORMULA', ['=$F2="смотрел"']),
            format=CellFormat(backgroundColor=Color(0.8, 1, 0.8))
        )
    )
    yellow_rule = ConditionalFormatRule(
        ranges=[GridRange(sheetId=sheet_id,
                          startRowIndex=1, endRowIndex=1000,
                          startColumnIndex=0, endColumnIndex=6)],
        booleanRule=BooleanRule(
            condition=BooleanCondition('CUSTOM_FORMULA', ['=$F2="скипнул"']),
            format=CellFormat(backgroundColor=Color(1, 1, 0.8))
        )
    )
    rules.append(red_rule)
    rules.append(green_rule)
    rules.append(yellow_rule)
    rules.save()

def save_video_record(link, title, views, thumbnail=""):
    sheet = get_sheet()
    if sheet is None:
        print("Google Sheet не доступен!")
        return "error"

    if not sheet.get_all_values():
        initialize_sheet(sheet)

    values = sheet.get_all_values()
    for row in values[1:]:
        if row[1] == link:
            print("Видео уже существует в таблице:", link)
            return "duplicate"

    new_id = len(values)
    if thumbnail:
        image_formula = f'=IMAGE("{thumbnail}";4;150;200)'
    else:
        image_formula = ""

    try:
        int_views = int(views)
    except:
        int_views = 0

    new_row = [new_id, link, title or "", int_views, image_formula, "не смотрел"]
    try:
        sheet.append_row(new_row, value_input_option="USER_ENTERED")
        print("Запись добавлена:", new_row)

        new_index = len(sheet.get_all_values())
        set_row_height(sheet, f"{new_index}:{new_index}", 150)

        center_fmt = CellFormat(horizontalAlignment='CENTER')
        range_str = f"A{new_index}:F{new_index}"
        format_cell_range(sheet, range_str, center_fmt)

        return "added"
    except Exception as e:
        print("Ошибка при добавлении записи:", e)
        return "error"

def extract_video_id(link: str) -> str:
    match = re.search(r"(?:v=|/)([0-9A-Za-z_-]{11})", link)
    if match:
        return match.group(1)
    return None

def get_youtube_info(video_id: str):
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {"id": video_id, "part": "snippet,statistics", "key": YOUTUBE_API_KEY}
    try:
        response = requests.get(url, params=params)
        data = response.json()
        if "items" in data and len(data["items"]) > 0:
            item = data["items"][0]
            snippet = item.get("snippet", {})
            statistics = item.get("statistics", {})
            title = snippet.get("title", "")
            thumb_url = snippet.get("thumbnails", {}).get("high", {}).get("url", "")
            view_count = statistics.get("viewCount", "0")
            return title, thumb_url, view_count
        else:
            return None, None, None
    except Exception as e:
        print("Ошибка при запросе к YouTube Data API:", e)
        return None, None, None

# ------------------------------------------------------------------------------
# Хендлеры команд (/reply, /tag, /export)
# ------------------------------------------------------------------------------
@bot.message_handler(commands=['reply'])
def reply_to_cooperation(message):
    print("reply_to_cooperation called by user_id =", message.from_user.id)
    if message.from_user.id != OWNER_ID:
        print("Not the owner!")
        return
    parts = message.text.split(maxsplit=2)
    if len(parts) < 3:
        bot.reply_to(message, "Использование: /reply <ID> <ваш ответ>")
        return
    try:
        coop_id = int(parts[1])
    except ValueError:
        bot.reply_to(message, "Ошибка: ID должен быть числом.")
        return
    reply_text = parts[2]
    if coop_id not in cooperation_requests:
        bot.reply_to(message, "Запрос с таким ID не найден.")
        return
    user_chat_id = cooperation_requests[coop_id]
    bot.send_message(user_chat_id, f"{reply_text}")
    bot.reply_to(message, "Сообщение отправлено.")

@bot.message_handler(commands=['tag'])
def tag_video(message):
    user_id = message.from_user.id
    if user_id != OWNER_ID and user_id not in MODERATOR_IDS:
        return
    parts = message.text.split(maxsplit=2)
    if len(parts) < 3:
        bot.reply_to(message, "Использование: /tag <ID> <статус>")
        return
    _, id_str, status = parts
    if not id_str.isdigit():
        bot.reply_to(message, "Ошибка: ID должен быть числом.")
        return
    video_id = int(id_str)
    status = status.lower()
    if status not in ("смотрел", "не смотрел", "скипнул"):
        bot.reply_to(message, "Недопустимый статус. Используйте: смотрел/не смотрел/скипнул.")
        return
    sheet = get_sheet()
    if sheet is None:
        bot.reply_to(message, "Google Sheet не доступен.")
        return
    try:
        values = sheet.get_all_values()
        if video_id < 1 or video_id >= len(values):
            bot.reply_to(message, f"Запись с ID {video_id} не найдена.")
            return
        row_num = video_id + 1
        sheet.update_cell(row_num, 6, status)
        bot.reply_to(message, f"✅ Видео ID {video_id} отмечено как '{status}'.")
    except Exception as e:
        bot.reply_to(message, "Ошибка при обновлении записи.")

@bot.message_handler(commands=['export', 'table'])
def export_table(message):
    if message.from_user.id != OWNER_ID:
        return
    sheet_url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit"
    bot.send_message(message.chat.id, f"Вот ссылка на таблицу:\n{sheet_url}")

# ------------------------------------------------------------------------------
# /start + inline-клавиатура
# ------------------------------------------------------------------------------
@bot.message_handler(commands=['start'])
def start_command(message):
    markup = types.InlineKeyboardMarkup()
    btn_video = types.InlineKeyboardButton("Предложить видео", callback_data="video")
    btn_coop  = types.InlineKeyboardButton("По сотрудничеству", callback_data="coop")
    markup.add(btn_video, btn_coop)
    bot.send_message(message.chat.id, "Привет! Насчет чего пишешь?", reply_markup=markup)
    user_state[message.chat.id] = None

@bot.callback_query_handler(func=lambda call: call.data in ["video", "coop", "back"])
def callback_inline(call):
    if call.data == "video":
        markup = types.InlineKeyboardMarkup()
        btn_back = types.InlineKeyboardButton("Назад", callback_data="back")
        markup.add(btn_back)
        try:
            bot.edit_message_text(chat_id=call.message.chat.id,
                                  message_id=call.message.message_id,
                                  text="Отправляй ссылку на видос",
                                  reply_markup=markup)
        except Exception as e:
            print("Ошибка редактирования:", e)
        user_state[call.message.chat.id] = "wait_video"

    elif call.data == "coop":
        markup = types.InlineKeyboardMarkup()
        btn_back = types.InlineKeyboardButton("Назад", callback_data="back")
        markup.add(btn_back)
        try:
            bot.edit_message_text(chat_id=call.message.chat.id,
                                  message_id=call.message.message_id,
                                  text="Я ознакомлюсь и отпишу тебе либо в ЛС, либо здесь",
                                  reply_markup=markup)
        except Exception as e:
            print("Ошибка редактирования:", e)
        user_state[call.message.chat.id] = "wait_coop"

    elif call.data == "back":
        markup = types.InlineKeyboardMarkup()
        btn_video = types.InlineKeyboardButton("Предложить видео", callback_data="video")
        btn_coop  = types.InlineKeyboardButton("По сотрудничеству", callback_data="coop")
        markup.add(btn_video, btn_coop)
        try:
            bot.edit_message_text(chat_id=call.message.chat.id,
                                  message_id=call.message.message_id,
                                  text="Привет! Насчет чего пишешь?",
                                  reply_markup=markup)
        except Exception as e:
            print("Ошибка редактирования:", e)
        user_state[call.message.chat.id] = None

# ------------------------------------------------------------------------------
# Универсальный обработчик сообщений для "wait_video" / "wait_coop"
# ------------------------------------------------------------------------------
@bot.message_handler(func=lambda m: True)
def any_message_handler(message):
    state = user_state.get(message.chat.id, None)

    if state == "wait_video":
        link = message.text.strip()
        allowed_domains = ["youtube.com", "youtu.be", "spotify.com", "twitch.tv"]
        if not any(domain in link for domain in allowed_domains):
            bot.send_message(message.chat.id, "❗ Пожалуйста, отправьте ссылку на поддерживаемый сайт.")
            return
        video_title = ""
        view_count = ""
        thumbnail = ""
        video_id = extract_video_id(link)
        if video_id:
            title, thumb, views = get_youtube_info(video_id)
            if title:
                video_title = title
                view_count = views
                thumbnail = thumb

        result = save_video_record(link, video_title, view_count, thumbnail)
        if result == "duplicate":
            bot.send_message(message.chat.id, "❗ Это видео уже предложено ранее.")
        elif result == "added":
            bot.send_message(message.chat.id, "✅ Спасибо! Ваше видео предложено.")
        else:
            bot.send_message(message.chat.id, "Ошибка при сохранении видео.")
        user_state[message.chat.id] = None

    elif state == "wait_coop":
        text = message.text.strip()
        if not text:
            bot.send_message(message.chat.id, "Сообщение пустое. Отмена.")
            user_state[message.chat.id] = None
            return
        user_name = message.from_user.username or message.from_user.first_name or str(message.from_user.id)
        # Генерируем единый текст
        global next_coop_id, cooperation_requests
        coop_id = next_coop_id
        next_coop_id += 1
        cooperation_requests[coop_id] = message.chat.id

        combined_text = (
            f"🤝 Запрос по сотрудничеству от {user_name}:\n\"{text}\"\n\n"
            f"Код запроса: {coop_id}. Используйте команду /reply {coop_id} <ваш ответ> для ответа."
        )
        try:
            bot.send_message(CHANNEL_ID, combined_text)
        except Exception as e:
            bot.send_message(message.chat.id, "Ошибка при отправке сообщения в канал.")
        user_state[message.chat.id] = None
    else:
        pass

# ------------------------------------------------------------------------------
# Запуск бота
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    print("Бот запущен...")
    bot.polling(none_stop=True)
