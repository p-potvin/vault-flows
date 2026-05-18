import sys
import os
import unittest
from unittest.mock import MagicMock, patch, mock_open

# Mock redis to avoid ModuleNotFoundError
sys.modules['redis'] = MagicMock()

# Add the directory containing the modules to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Mock RedisCoordinator before it's used by imports
mock_coordinator = MagicMock()
sys.modules['redis_coordinator'] = MagicMock()
sys.modules['redis_coordinator'].RedisCoordinator = MagicMock(return_value=mock_coordinator)

from lonely_manager import LonelyManager

class TestLonelyManager(unittest.TestCase):
    def setUp(self):
        # Instantiate with dummy paths
        self.manager = LonelyManager(
            agent_id="test_manager",
            todo_path="fake_todo.md",
            roadmap_path="fake_roadmap.md"
        )

    def test_load_project_files_not_found(self):
        """Test that fallback values are set when files are missing."""
        # We need to patch 'builtins.open' which is used by '_load_project_files'
        with patch("builtins.open", side_effect=FileNotFoundError):
            self.manager._load_project_files()

        self.assertEqual(self.manager._todo_content, "(TODO.md not found)")
        self.assertEqual(self.manager._roadmap_content, "(ROADMAP.md not found)")

    def test_load_project_files_success(self):
        """Test that content is correctly loaded when files exist."""
        todo_content = "Plan for today"
        roadmap_content = "Vision for the future"

        def mocked_open(path, *args, **kwargs):
            if "todo" in path.lower():
                return mock_open(read_data=todo_content).return_value
            elif "roadmap" in path.lower():
                return mock_open(read_data=roadmap_content).return_value
            return mock_open().return_value

        with patch("builtins.open", side_effect=mocked_open):
            self.manager._load_project_files()

        self.assertEqual(self.manager._todo_content, todo_content)
        self.assertEqual(self.manager._roadmap_content, roadmap_content)

if __name__ == '__main__':
    unittest.main()
