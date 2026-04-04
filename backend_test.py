#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class LMSAPITester:
    def __init__(self, base_url="https://learn-hub-903.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.teacher_credentials = {
            "user_id": "admin",
            "password": "teacher123"
        }
        self.created_resources = {
            "students": [],
            "parents": [],
            "subjects": [],
            "chapters": [],
            "topics": []
        }

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        return success

    def test_teacher_login(self):
        """Test teacher login functionality"""
        print("\n🔍 Testing Teacher Login...")
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json=self.teacher_credentials,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "teacher" and data.get("user_id") == self.teacher_credentials["user_id"]:
                    return self.log_test("Teacher login", True)
                else:
                    return self.log_test("Teacher login", False, f"Invalid response data: {data}")
            else:
                return self.log_test("Teacher login", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            return self.log_test("Teacher login", False, f"Exception: {str(e)}")

    def test_auth_me(self):
        """Test getting current user info"""
        print("\n🔍 Testing Auth Me...")
        try:
            response = self.session.get(f"{self.base_url}/auth/me", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "teacher":
                    return self.log_test("Auth me", True)
                else:
                    return self.log_test("Auth me", False, f"Invalid role: {data.get('role')}")
            else:
                return self.log_test("Auth me", False, f"Status {response.status_code}")
                
        except Exception as e:
            return self.log_test("Auth me", False, f"Exception: {str(e)}")

    def test_create_student(self):
        """Test creating a student account"""
        print("\n🔍 Testing Create Student...")
        try:
            student_data = {
                "user_id": f"student_{datetime.now().strftime('%H%M%S')}",
                "password": "student123",
                "name": "Test Student",
                "role": "student"
            }
            
            response = self.session.post(
                f"{self.base_url}/users",
                json=student_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "student" and data.get("user_id") == student_data["user_id"]:
                    self.created_resources["students"].append(data["id"])
                    return self.log_test("Create student", True)
                else:
                    return self.log_test("Create student", False, f"Invalid response: {data}")
            else:
                return self.log_test("Create student", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            return self.log_test("Create student", False, f"Exception: {str(e)}")

    def test_create_parent(self):
        """Test creating a parent account linked to a student"""
        print("\n🔍 Testing Create Parent...")
        try:
            if not self.created_resources["students"]:
                return self.log_test("Create parent", False, "No student available to link parent")
            
            parent_data = {
                "user_id": f"parent_{datetime.now().strftime('%H%M%S')}",
                "password": "parent123",
                "name": "Test Parent",
                "role": "parent",
                "student_id": self.created_resources["students"][0]
            }
            
            response = self.session.post(
                f"{self.base_url}/users",
                json=parent_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "parent" and data.get("student_id") == parent_data["student_id"]:
                    self.created_resources["parents"].append(data["id"])
                    return self.log_test("Create parent", True)
                else:
                    return self.log_test("Create parent", False, f"Invalid response: {data}")
            else:
                return self.log_test("Create parent", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            return self.log_test("Create parent", False, f"Exception: {str(e)}")

    def test_list_users(self):
        """Test listing users"""
        print("\n🔍 Testing List Users...")
        try:
            # Test listing students
            response = self.session.get(f"{self.base_url}/users?role=student", timeout=10)
            if response.status_code != 200:
                return self.log_test("List students", False, f"Status {response.status_code}")
            
            students = response.json()
            if not isinstance(students, list):
                return self.log_test("List students", False, "Response is not a list")
            
            # Test listing parents
            response = self.session.get(f"{self.base_url}/users?role=parent", timeout=10)
            if response.status_code != 200:
                return self.log_test("List parents", False, f"Status {response.status_code}")
            
            parents = response.json()
            if not isinstance(parents, list):
                return self.log_test("List parents", False, "Response is not a list")
            
            return self.log_test("List users", True)
                
        except Exception as e:
            return self.log_test("List users", False, f"Exception: {str(e)}")

    def test_create_subject(self):
        """Test creating a subject"""
        print("\n🔍 Testing Create Subject...")
        try:
            subject_data = {
                "name": f"Test Subject {datetime.now().strftime('%H%M%S')}",
                "description": "A test subject for automated testing"
            }
            
            response = self.session.post(
                f"{self.base_url}/subjects",
                json=subject_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("name") == subject_data["name"]:
                    self.created_resources["subjects"].append(data["id"])
                    return self.log_test("Create subject", True)
                else:
                    return self.log_test("Create subject", False, f"Invalid response: {data}")
            else:
                return self.log_test("Create subject", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            return self.log_test("Create subject", False, f"Exception: {str(e)}")

    def test_create_chapter(self):
        """Test creating a chapter"""
        print("\n🔍 Testing Create Chapter...")
        try:
            if not self.created_resources["subjects"]:
                return self.log_test("Create chapter", False, "No subject available to create chapter")
            
            chapter_data = {
                "subject_id": self.created_resources["subjects"][0],
                "name": f"Test Chapter {datetime.now().strftime('%H%M%S')}",
                "description": "A test chapter",
                "order": 1
            }
            
            response = self.session.post(
                f"{self.base_url}/chapters",
                json=chapter_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("name") == chapter_data["name"]:
                    self.created_resources["chapters"].append(data["id"])
                    return self.log_test("Create chapter", True)
                else:
                    return self.log_test("Create chapter", False, f"Invalid response: {data}")
            else:
                return self.log_test("Create chapter", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            return self.log_test("Create chapter", False, f"Exception: {str(e)}")

    def test_create_topic(self):
        """Test creating a topic"""
        print("\n🔍 Testing Create Topic...")
        try:
            if not self.created_resources["chapters"]:
                return self.log_test("Create topic", False, "No chapter available to create topic")
            
            topic_data = {
                "chapter_id": self.created_resources["chapters"][0],
                "name": f"Test Topic {datetime.now().strftime('%H%M%S')}",
                "content": "This is test content for the topic",
                "video_link": "https://youtube.com/watch?v=test",
                "questions": "Q1: What is 2+2?\nQ2: What is 3+3?"
            }
            
            response = self.session.post(
                f"{self.base_url}/topics",
                json=topic_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("name") == topic_data["name"]:
                    self.created_resources["topics"].append(data["id"])
                    return self.log_test("Create topic", True)
                else:
                    return self.log_test("Create topic", False, f"Invalid response: {data}")
            else:
                return self.log_test("Create topic", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            return self.log_test("Create topic", False, f"Exception: {str(e)}")

    def test_list_curriculum(self):
        """Test listing subjects, chapters, and topics"""
        print("\n🔍 Testing List Curriculum...")
        try:
            # Test subjects
            response = self.session.get(f"{self.base_url}/subjects", timeout=10)
            if response.status_code != 200:
                return self.log_test("List subjects", False, f"Status {response.status_code}")
            
            subjects = response.json()
            if not isinstance(subjects, list):
                return self.log_test("List subjects", False, "Response is not a list")
            
            # Test chapters if we have a subject
            if self.created_resources["subjects"]:
                response = self.session.get(
                    f"{self.base_url}/chapters?subject_id={self.created_resources['subjects'][0]}", 
                    timeout=10
                )
                if response.status_code != 200:
                    return self.log_test("List chapters", False, f"Status {response.status_code}")
            
            # Test topics if we have a chapter
            if self.created_resources["chapters"]:
                response = self.session.get(
                    f"{self.base_url}/topics?chapter_id={self.created_resources['chapters'][0]}", 
                    timeout=10
                )
                if response.status_code != 200:
                    return self.log_test("List topics", False, f"Status {response.status_code}")
            
            return self.log_test("List curriculum", True)
                
        except Exception as e:
            return self.log_test("List curriculum", False, f"Exception: {str(e)}")

    def test_submissions_endpoint(self):
        """Test submissions endpoint"""
        print("\n🔍 Testing Submissions Endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/submissions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    return self.log_test("List submissions", True)
                else:
                    return self.log_test("List submissions", False, "Response is not a list")
            else:
                return self.log_test("List submissions", False, f"Status {response.status_code}")
                
        except Exception as e:
            return self.log_test("List submissions", False, f"Exception: {str(e)}")

    def test_fee_setup(self):
        """Test setting up fees for a student"""
        print("\n🔍 Testing Fee Setup...")
        try:
            if not self.created_resources["students"]:
                return self.log_test("Fee setup", False, "No student available for fee setup")
            
            student_id = self.created_resources["students"][0]
            fee_data = {
                "student_id": student_id,
                "total_fee": 1000.0
            }
            
            response = self.session.post(
                f"{self.base_url}/fees/setup",
                json=fee_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "total_fee" in data:
                    return self.log_test("Fee setup", True)
                else:
                    return self.log_test("Fee setup", False, f"Invalid response: {data}")
            else:
                return self.log_test("Fee setup", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            return self.log_test("Fee setup", False, f"Exception: {str(e)}")

    def test_add_payment(self):
        """Test adding a payment for a student"""
        print("\n🔍 Testing Add Payment...")
        try:
            if not self.created_resources["students"]:
                return self.log_test("Add payment", False, "No student available for payment")
            
            student_id = self.created_resources["students"][0]
            payment_data = {
                "student_id": student_id,
                "amount": 250.0,
                "date": datetime.now().strftime('%Y-%m-%d'),
                "description": "Test payment"
            }
            
            response = self.session.post(
                f"{self.base_url}/fees/payment",
                json=payment_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "payment" in data:
                    return self.log_test("Add payment", True)
                else:
                    return self.log_test("Add payment", False, f"Invalid response: {data}")
            else:
                return self.log_test("Add payment", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            return self.log_test("Add payment", False, f"Exception: {str(e)}")

    def test_get_student_fees(self):
        """Test getting fee details for a student"""
        print("\n🔍 Testing Get Student Fees...")
        try:
            if not self.created_resources["students"]:
                return self.log_test("Get student fees", False, "No student available")
            
            student_id = self.created_resources["students"][0]
            response = self.session.get(f"{self.base_url}/fees/student/{student_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_fee", "paid_fee", "pending_fee", "payment_history"]
                if all(field in data for field in required_fields):
                    return self.log_test("Get student fees", True)
                else:
                    return self.log_test("Get student fees", False, f"Missing fields in response: {data}")
            else:
                return self.log_test("Get student fees", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            return self.log_test("Get student fees", False, f"Exception: {str(e)}")

    def test_get_all_fees(self):
        """Test getting all fees (teacher view)"""
        print("\n🔍 Testing Get All Fees...")
        try:
            response = self.session.get(f"{self.base_url}/fees", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) or isinstance(data, dict):
                    return self.log_test("Get all fees", True)
                else:
                    return self.log_test("Get all fees", False, f"Invalid response type: {type(data)}")
            else:
                return self.log_test("Get all fees", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            return self.log_test("Get all fees", False, f"Exception: {str(e)}")

    def test_student_login(self):
        """Test student login with created credentials"""
        print("\n🔍 Testing Student Login...")
        try:
            if not self.created_resources["students"]:
                return self.log_test("Student login", False, "No student created to test login")
            
            # We need to get the student's user_id from the created student
            # For now, let's create a new session and try to login with known credentials
            student_session = requests.Session()
            
            # Use the user_id we created earlier
            student_credentials = {
                "user_id": f"student_{datetime.now().strftime('%H%M%S')}",
                "password": "student123"
            }
            
            # First create a student with known credentials
            student_data = {
                "user_id": student_credentials["user_id"],
                "password": student_credentials["password"],
                "name": "Login Test Student",
                "role": "student"
            }
            
            create_response = self.session.post(
                f"{self.base_url}/users",
                json=student_data,
                timeout=10
            )
            
            if create_response.status_code != 200:
                return self.log_test("Student login", False, "Failed to create test student")
            
            # Now try to login with student credentials
            login_response = student_session.post(
                f"{self.base_url}/auth/login",
                json=student_credentials,
                timeout=10
            )
            
            if login_response.status_code == 200:
                data = login_response.json()
                if data.get("role") == "student" and data.get("user_id") == student_credentials["user_id"]:
                    return self.log_test("Student login", True)
                else:
                    return self.log_test("Student login", False, f"Invalid login response: {data}")
            else:
                return self.log_test("Student login", False, f"Login failed with status {login_response.status_code}: {login_response.text}")
                
        except Exception as e:
            return self.log_test("Student login", False, f"Exception: {str(e)}")

    def test_logout(self):
        """Test logout functionality"""
        print("\n🔍 Testing Logout...")
        try:
            response = self.session.post(f"{self.base_url}/auth/logout", timeout=10)
            
            if response.status_code == 200:
                # Try to access protected endpoint after logout
                auth_response = self.session.get(f"{self.base_url}/auth/me", timeout=10)
                if auth_response.status_code == 401:
                    return self.log_test("Logout", True)
                else:
                    return self.log_test("Logout", False, "Still authenticated after logout")
            else:
                return self.log_test("Logout", False, f"Status {response.status_code}")
                
        except Exception as e:
            return self.log_test("Logout", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting LMS API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Authentication tests
        if not self.test_teacher_login():
            print("❌ Login failed - stopping tests")
            return False
        
        self.test_auth_me()
        
        # User management tests
        self.test_create_student()
        self.test_create_parent()
        self.test_list_users()
        
        # Fee management tests
        self.test_fee_setup()
        self.test_add_payment()
        self.test_get_student_fees()
        self.test_get_all_fees()
        
        # Student login test
        self.test_student_login()
        
        # Curriculum tests
        self.test_create_subject()
        self.test_create_chapter()
        self.test_create_topic()
        self.test_list_curriculum()
        
        # Other endpoints
        self.test_submissions_endpoint()
        
        # Logout test
        self.test_logout()
        
        # Print summary
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = LMSAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())