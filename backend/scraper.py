import json
import time

from bs4 import BeautifulSoup
from selenium.webdriver import ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from seleniumwire import webdriver


def create_driver(user_agent=None, headless=True):
    if not user_agent:
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/122.0.2365.92"

    options = ChromeOptions()
    options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    options.add_experimental_option("useAutomationExtension", False)
    if headless:
        options.add_argument("--headless")
    options.add_argument("start-maximized")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-http2")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("log-level=3")
    driver = webdriver.Chrome(options=options)
    driver.execute_cdp_cmd("Network.setUserAgentOverride", {"userAgent": user_agent})
    return driver


class Scraper:
    def __init__(self):
        self.driver = create_driver()
        self.wait = WebDriverWait(self.driver, 10)
        self.scroll_config = {"scroll_steps": 3, "scroll_pause": 1.5}

    def scroll(self):
        if self.scroll_config:
            total_height = self.driver.execute_script("return document.body.scrollHeight")
            for _ in range(self.scroll_config.get("scroll_steps", 3)):
                self.driver.execute_script(f"window.scrollTo(0, {_ * total_height // self.scroll_config.get('scroll_steps', 3)});")
                time.sleep(self.scroll_config.get("scroll_pause", 1))

            # Scroll to bottom to ensure all content is loaded
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(self.scroll_config.get("scroll_pause", 1))

    def scrape_website(self, url, scroll_config=None):
        print(url)
        try:
            if scroll_config:
                self.scroll_config = scroll_config

            xpath = "//div[@class='info-section']"

            self.driver.get(url)
            self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))

            self.scroll()
            elements = self.driver.find_elements(By.XPATH, xpath)
            print(len(elements))
            inner_htmls = [div.get_attribute("innerHTML") for div in elements]
            print(inner_htmls)
            self.driver.implicitly_wait(10)
            self.driver.quit()
            return inner_htmls

        except Exception as e:
            print(f"Scraping failed: {e}")
            return None


def create_dict(html_list, gender):
    data_list = []
    for div in html_list:
        soup = BeautifulSoup(div, "html.parser")

        # Extract name
        name = soup.find("h2", class_="doctor-name").text if soup.find("h2", class_="doctor-name") else None

        # Extract location
        location_tag = soup.find("span", {"data-qa-id": "practice_locality"})
        city_tag = soup.find("span", {"data-qa-id": "practice_city"})
        location = f"{location_tag.text}, {city_tag.text}" if location_tag and city_tag else None

        # Extract hospital/clinic name
        hospital_tag = soup.find("span", {"data-qa-id": "doctor_clinic_name"})
        hospital_name = hospital_tag.text if hospital_tag else None

        # Extract consultation fee
        fee_tag = soup.find("span", {"data-qa-id": "consultation_fee"})
        consultation_fee = fee_tag.text if fee_tag else None

        # Extract reviews and stories
        recommendation_tag = soup.find("span", {"data-qa-id": "doctor_recommendation"})
        reviews = recommendation_tag.text.strip("% ") if recommendation_tag else None

        feedback_tag = soup.find("span", {"data-qa-id": "total_feedback"})
        stories = feedback_tag.text.split(" ")[0] if feedback_tag else None

        # Append the details as a dictionary
        data_list.append(
            {
                "name": name,
                "location": location,
                "hospital_name": hospital_name,
                "consultation_fee": consultation_fee,
                "reviews": reviews,
                "stories": stories,
                "gender": gender,
            }
        )

    return data_list


city = "hyderabad"
output = []

for gender in ["male", "female"]:
    url = f"https://www.practo.com/{city}/doctors-for-individual-therapy?filters%5Bdoctor_gender%5D%5B%5D={gender}"
    s = Scraper()
    html_list = s.scrape_website(url)
    output.extend(create_dict(html_list, gender))


with open("data.json", "w", encoding="utf-8") as json_file:
    json.dump(output, json_file, ensure_ascii=False, indent=4)
