from datetime import datetime
import vc
import os
import shutil

class FileKeeper:
    def __init__(self):
        self.backup_path = ".backup"
        self.contents_path = os.path.join(self.backup_path,"contents")
        self.index_path = os.path.join(self.backup_path,".index")
        self.identity_string = "BACKUP INDEX FILE"
        self.not_exist_msg = "Error: backup not initialised"
        self.already_init_msg = "Error: backup repository already setup in this folder"
        self.no_existing_backup = "Error: no backups found"
        self.identity_string = "FILE KEEPER INDEX FILE"

    def initialise(self):
        """
        Initialise the repo.
        """
        if vc.is_init(self.backup_path, [self.contents_path], self.index_path,
                self.identity_string):
           print(self.already_init_msg)
           return False

        return vc.init(self.backup_path, [self.contents_path],
                self.index_path, self.identity_string)

    def remove_repository(self):
        """
        Remove the repo.
        """
        if vc.remove_repository(self.backup_path):
            return True
        else: 
            print(self.not_exist_msg)
            return False
        
    def get_backups(self):
        """
        Get the records of all the backups stored in a pgit index file
        """
        backups = []
        with open(self.index_path) as f:
            f.readline() # id line
            backups = [line.split(";") for line in f]
        return backups

    def backup(self):
        """
        Backup into .backup/contents/x where x is the number of repos plus one.
        """
        if not vc.is_init(self.backup_path, [self.contents_path],
                self.index_path, self.identity_string):
            print(self.not_exist_msg)
            return False
        backup_no = str(len(self.get_backups())+1)
        os.mkdir(os.path.join(self.contents_path,backup_no))
        files = os.listdir()
        files.remove(self.backup_path)
        vc.cp(zip(files,files),".",os.path.join(self.contents_path,backup_no))
        with open(self.index_path,"a") as f:
            f.write("\n%s;%s"%(backup_no,str(datetime.now())))
        return True


    def restore(self,backup_no=-1):
        """
        Remove the current directory's contents and replace it with backup
        number selected
        """
        if not vc.is_init(self.backup_path, [self.contents_path],
                self.index_path, self.identity_string):
            print(self.not_exist_msg)
            return False

        if backup_no==-1:
            backup_no = len(self.get_backups())

        backup_file_path = os.path.join(self.contents_path, str(backup_no))

        if backup_no == 0 or not os.path.exists(backup_file_path):
            print(self.no_existing_backup)
            return False

        del_files = os.listdir(".")
        del_files.remove(self.backup_path)
        vc.rm(del_files, ".")
        files = os.listdir(backup_file_path)
        return vc.cp(zip(files,files),backup_file_path,".")
