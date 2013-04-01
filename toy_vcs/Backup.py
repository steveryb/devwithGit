import os
import shutil
import argparse
import vc
class Backup:
    """
    Backup Keeper - a simple backup system using one folder

    Backup keeper, once initialised, keeps a backup of the contents of this folder
    and all those it contains in a folder called .backup. When backing it, it simply
    overwrites this folder.
    """
    def __init__(self):
        self.backup_path = ".backup"
        self.contents_path = os.path.join(self.backup_path,"contents")
        self.index_path = os.path.join(self.backup_path,".index")
        self.identity_string = "BACKUP INDEX FILE"
        self.not_exist_msg = "Error: backup not initialised"
        self.already_init_msg = "Error: backup repository already setup in this folder"

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

    def backup(self):
        """
        Backup into .backup/contents
        """
        if not vc.is_init(self.backup_path, [self.contents_path],
                self.index_path, self.identity_string):
            print(self.not_exist_msg)
            return False
        files = os.listdir()
        files.remove(self.backup_path)
        return vc.cp(zip(files,files),".",self.contents_path)

    def restore(self):
        """
        Remove the current directory's contents and replace it with .backup/contents
        """
        if not vc.is_init(self.backup_path, [self.contents_path],
                self.index_path, self.identity_string):
            print(self.not_exist_msg)
            return False
        del_files = os.listdir()
        del_files.remove(self.backup_path)
        vc.rm(del_files,".")
        files = os.listdir(self.contents_path)
        vc.cp(zip(files,files),self.contents_path,".")
        return True
