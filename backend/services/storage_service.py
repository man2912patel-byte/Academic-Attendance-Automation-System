import os
import shutil
import abc

class StorageProvider(abc.ABC):
    @abc.abstractmethod
    def save_file(self, file_data, user_id, filename) -> str:
        """Saves file and returns the relative path from backend root."""
        pass
        
    @abc.abstractmethod
    def delete_file(self, file_path) -> bool:
        """Deletes file from storage."""
        pass
        
    @abc.abstractmethod
    def read_file(self, file_path) -> bytes:
        """Reads file and returns bytes."""
        pass

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir):
        # base_dir is 'backend/uploads'
        self.base_dir = os.path.abspath(base_dir)
        
    def save_file(self, file_data, user_id, filename) -> str:
        user_dir = os.path.join(self.base_dir, str(user_id))
        os.makedirs(user_dir, exist_ok=True)
        
        file_path = os.path.join(user_dir, filename)
        if hasattr(file_data, 'save'):
            file_data.save(file_path)
        else:
            with open(file_path, 'wb') as f:
                f.write(file_data)
                
        return f"uploads/{user_id}/{filename}"
        
    def delete_file(self, file_path) -> bool:
        if not file_path:
            return False
        # Resolve relative to the backend root (which is parent of 'uploads' folder)
        backend_root = os.path.dirname(self.base_dir)
        abs_path = os.path.abspath(os.path.join(backend_root, file_path))
        
        # Verify path containment to prevent directory traversal
        if not abs_path.startswith(self.base_dir):
            return False
            
        if os.path.exists(abs_path):
            if os.path.isdir(abs_path):
                shutil.rmtree(abs_path)
            else:
                os.remove(abs_path)
            print(f"[LOG] File path: {abs_path} - File deleted")
            return True
        return False
        
    def read_file(self, file_path) -> bytes:
        backend_root = os.path.dirname(self.base_dir)
        abs_path = os.path.abspath(os.path.join(backend_root, file_path))
        
        if not abs_path.startswith(self.base_dir):
            raise PermissionError("Access denied to requested file path.")
            
        print(f"[LOG] File path: {abs_path} - Open started")
        with open(abs_path, 'rb') as f:
            data = f.read()
        print(f"[LOG] File path: {abs_path} - Read completed")
        return data

class StorageService:
    _provider = None
    
    @classmethod
    def get_provider(cls) -> StorageProvider:
        if cls._provider is None:
            from flask import current_app
            base_dir = current_app.config.get('UPLOADS_DIR')
            cls._provider = LocalStorageProvider(base_dir)
        return cls._provider
